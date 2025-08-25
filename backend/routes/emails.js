const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../database/factory");

const router = express.Router();

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// Create email campaign
router.post("/campaigns", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, subject, body, googleSheetUrl, senderEmail } = req.body;

    if (!name || !subject || !body || !googleSheetUrl) {
      return res.status(400).json({
        error: "Name, subject, body, and Google Sheet URL are required",
      });
    }

    // Verify user has Gmail credentials
    const gmailCreds = await db.getGmailCredentials(userId);

    if (!gmailCreds) {
      return res.status(400).json({
        error: "Please connect your Gmail account first",
      });
    }

    const result = await db.createCampaign({
      user_id: userId,
      name: name,
      subject: subject,
      body: body,
      sender_email: senderEmail || gmailCreds.email,
      google_sheet_url: googleSheetUrl,
      status: "draft",
    });

    res.json({
      success: true,
      campaignId: result.id,
      message: "Campaign created successfully",
    });
  } catch (error) {
    console.error("Create campaign error:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// Update campaign status (used by n8n webhook)
router.post("/campaigns/:campaignId/status", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status, totalRecipients, sentCount, failedCount, executionId } =
      req.body;

    await db.updateCampaign(campaignId, {
      status: status,
      total_recipients: totalRecipients || 0,
      sent_count: sentCount || 0,
      failed_count: failedCount || 0,
      n8n_execution_id: executionId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Update campaign status error:", error);
    res.status(500).json({ error: "Failed to update campaign status" });
  }
});

// Log email send result (used by n8n webhook)
router.post("/campaigns/:campaignId/logs", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { recipientEmail, status, messageId, errorMessage } = req.body;

    await db.logEmail({
      campaign_id: campaignId,
      recipient_email: recipientEmail,
      status: status,
      message_id: messageId,
      error_message: errorMessage,
      sent_at: status === "sent" ? new Date() : null,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Log email error:", error);
    res.status(500).json({ error: "Failed to log email result" });
  }
});

// Get email templates (optional feature)
router.get("/templates", authenticateToken, async (req, res) => {
  try {
    // You could create a templates table, for now return some basic templates
    const templates = [
      {
        id: 1,
        name: "Welcome Email",
        subject: "Welcome to {{company_name}}!",
        body: `Hi {{name}},

Welcome to {{company_name}}! We're excited to have you on board.

Best regards,
The {{company_name}} Team`,
      },
      {
        id: 2,
        name: "Newsletter",
        subject: "{{company_name}} Newsletter - {{month}} {{year}}",
        body: `Hi {{name}},

Here's what's new this month at {{company_name}}:

{{content}}

Best regards,
The {{company_name}} Team`,
      },
      {
        id: 3,
        name: "Promotional",
        subject: "Special Offer Just for You!",
        body: `Hi {{name}},

We have a special offer just for you! Use code {{promo_code}} to get {{discount}}% off your next purchase.

Valid until {{expiry_date}}.

Shop now: {{link}}

Best regards,
The {{company_name}} Team`,
      },
    ];

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Get templates error:", error);
    res.status(500).json({ error: "Failed to get templates" });
  }
});

module.exports = router;
