const express = require("express");
const db = require("../database/factory");
const EmailService = require("../services/emailService");

const router = express.Router();

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const jwt = require("jsonwebtoken");
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// Create and trigger email campaign
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { subject, body, googleSheetUrl, campaignName } = req.body;

    if (!subject || !body || !googleSheetUrl) {
      return res.status(400).json({
        error: "Subject, body, and Google Sheet URL are required",
      });
    }

    // Get user's Gmail credentials
    const gmailCreds = await db.getGmailCredentials(userId);

    if (!gmailCreds) {
      return res.status(400).json({
        error: "Gmail credentials not found. Please connect Gmail first.",
      });
    }

    // Create campaign record
    const campaignResult = await db.createCampaign({
      user_id: userId,
      name: campaignName || `Campaign-${Date.now()}`,
      subject: subject,
      body: body,
      sender_email: gmailCreds.email,
      google_sheet_url: googleSheetUrl,
      status: "created",
    });

    // Ensure ID is a string for MongoDB ObjectId compatibility
    const campaignId = campaignResult.id
      ? campaignResult.id.toString()
      : campaignResult.id;
    console.log("📧 Campaign created with ID:", campaignId);

    // Instead of processing immediately, just return the campaign info
    // The frontend will handle batch processing
    console.log("✅ Campaign created successfully, ready for batch processing");

    res.json({
      success: true,
      campaignId: campaignId,
      message:
        "Email campaign created successfully. Use /process-batch to start sending emails.",
      status: "created",
    });
  } catch (error) {
    console.error("Campaign creation error:", error);
    res.status(500).json({
      error: "Failed to create email campaign",
      details: error.message,
    });
  }
});

// Process a small batch of emails (non-blocking for concurrent users)
router.post(
  "/:campaignId/process-batch",
  authenticateToken,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { userId } = req.user;
      const { batchSize } = req.body;

      console.log(
        `📦 Processing batch for campaign ${campaignId} by user ${userId}`
      );

      // Verify campaign belongs to user
      const campaign = await db.getCampaign(campaignId);
      if (!campaign || campaign.user_id !== userId) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Process one batch
      const result = await EmailService.processCampaignBatch(
        campaignId,
        batchSize
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Batch processing error:", error);
      res.status(500).json({
        error: "Failed to process email batch",
        details: error.message,
      });
    }
  }
);

// Get campaign status and statistics
router.get("/status/:campaignId", authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { userId } = req.user;

    // Verify campaign belongs to user
    const campaign = await db.getCampaign(campaignId);

    if (!campaign || campaign.user_id !== userId) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const stats = await EmailService.getCampaignStats(campaignId);

    res.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    console.error("Get campaign status error:", error);
    res.status(500).json({
      error: "Failed to get campaign status",
      details: error.message,
    });
  }
});

// Get all campaigns for user
router.get("/list", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    const campaigns = await db.getUserCampaigns(userId);

    res.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Get campaigns error:", error);
    res.status(500).json({
      error: "Failed to get campaigns",
      details: error.message,
    });
  }
});

// Get campaign logs
router.get("/logs/:campaignId", authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { userId } = req.user;

    // Verify campaign belongs to user
    const campaign = await db.getCampaign(campaignId);

    if (!campaign || campaign.user_id !== userId) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const logs = await db.getCampaignLogs(campaignId);

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("Get campaign logs error:", error);
    res.status(500).json({
      error: "Failed to get campaign logs",
      details: error.message,
    });
  }
});

// Test Google Sheets connection
router.post("/test-sheet", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { googleSheetUrl } = req.body;

    if (!googleSheetUrl) {
      return res.status(400).json({ error: "Google Sheet URL is required" });
    }

    const oauth2Client = await EmailService.createOAuthClient(userId);
    const recipients = await EmailService.getRecipientsFromSheet(
      googleSheetUrl,
      oauth2Client
    );

    res.json({
      success: true,
      message: "Google Sheet connection successful",
      recipientCount: recipients.length,
      preview: recipients.slice(0, 5), // Show first 5 recipients as preview
    });
  } catch (error) {
    console.error("Test sheet error:", error);

    // Check if it's an authentication/permission error
    if (
      error.message.includes("insufficient authentication scopes") ||
      error.message.includes("Missing Google Sheets permissions")
    ) {
      return res.status(401).json({
        error: "Missing Google Sheets permissions",
        details: error.message,
        action: "reconnect_gmail",
      });
    }

    res.status(500).json({
      error: "Failed to connect to Google Sheet",
      details: error.message,
    });
  }
});

// Get Google Sheets setup guide
router.get("/sheet-setup-guide", authenticateToken, (req, res) => {
  res.json({
    success: true,
    guide: {
      title: "Google Sheets Setup Guide",
      steps: [
        {
          step: 1,
          title: "Create a Google Sheet",
          description: "Create a new Google Sheet or use an existing one",
          details: "Go to sheets.google.com and create a new sheet",
        },
        {
          step: 2,
          title: "Set up your columns",
          description: "Your sheet should have at least an 'Email' column",
          details:
            "Required: A column with 'email' in the header. Optional: A column with 'name' in the header for personalization.",
          example: "Example headers: Email, Name, Company, etc.",
        },
        {
          step: 3,
          title: "Add recipient data",
          description: "Add your email recipients data",
          details:
            "Fill in the rows below the headers with your recipient information",
        },
        {
          step: 4,
          title: "Share the sheet (if needed)",
          description: "Make sure the sheet is accessible",
          details:
            "Either make the sheet public (Anyone with link can view) or ensure it's owned by the same Google account you connected to this app",
        },
        {
          step: 5,
          title: "Copy the sheet URL",
          description: "Copy the complete Google Sheets URL",
          details:
            "The URL should look like: https://docs.google.com/spreadsheets/d/SHEET_ID/edit...",
        },
      ],
      troubleshooting: [
        {
          issue: "Permission denied error",
          solution:
            "Make sure the sheet is shared with your connected Gmail account or set to 'Anyone with link can view'",
        },
        {
          issue: "No email column found",
          solution:
            "Ensure you have a column header that contains the word 'email' (case insensitive)",
        },
        {
          issue: "Sheet is empty",
          solution: "Add at least one row of data below your headers",
        },
        {
          issue: "Missing Google Sheets permissions",
          solution:
            "Disconnect and reconnect your Gmail account to grant Sheets access",
        },
      ],
    },
  });
});

// Continue paused campaign (authenticated endpoint)
router.post("/:campaignId/continue", authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;

    console.log(`🔄 Continuing campaign: ${campaignId}`);

    // Verify campaign belongs to user and needs continuation
    const campaign = await db.getCampaign(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.user_id !== req.user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (campaign.status !== "paused" || !campaign.needs_continuation) {
      return res.status(400).json({
        error: "Campaign doesn't need continuation",
        status: campaign.status,
        needs_continuation: campaign.needs_continuation,
      });
    }

    // Resume processing
    setImmediate(async () => {
      try {
        await EmailService.continueCampaign(campaignId);
      } catch (error) {
        console.error(`Campaign ${campaignId} continuation failed:`, error);
      }
    });

    res.json({
      message: "Campaign continuation started",
      campaignId: campaignId,
    });
  } catch (error) {
    console.error("Campaign continuation error:", error);
    res.status(500).json({
      error: "Failed to continue campaign",
      details: error.message,
    });
  }
});

// Internal system continuation (no auth required)
router.post("/:campaignId/internal-continue", async (req, res) => {
  try {
    const { campaignId } = req.params;
    // const { systemKey } = req.body;

    // Verify system key for internal calls
    // if (systemKey !== process.env.SYSTEM_SECRET_KEY) {
    //   return res.status(401).json({ error: "Invalid system key" });
    // }

    console.log(`🔄 Internal continuation for campaign: ${campaignId}`);

    // Get campaign without user verification (internal call)
    const campaign = await db.getCampaign(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.status !== "paused") {
      return res.status(400).json({
        error: "Campaign is not paused",
        status: campaign.status,
      });
    }

    // Resume processing immediately
    setImmediate(async () => {
      try {
        await EmailService.continueCampaign(campaignId);
      } catch (error) {
        console.error(
          `Campaign ${campaignId} internal continuation failed:`,
          error
        );
      }
    });

    res.json({
      message: "Internal campaign continuation started",
      campaignId: campaignId,
    });
  } catch (error) {
    console.error("Internal campaign continuation error:", error);
    res.status(500).json({
      error: "Failed to continue campaign internally",
      details: error.message,
    });
  }
});

// Delete campaign
router.delete("/:campaignId", authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { userId } = req.user;

    // Verify campaign belongs to user
    const campaign = await db.getCampaign(campaignId);

    if (!campaign || campaign.user_id !== userId) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Delete the campaign
    await db.deleteCampaign(campaignId);

    res.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("Delete campaign error:", error);
    res.status(500).json({
      error: "Failed to delete campaign",
      details: error.message,
    });
  }
});

module.exports = router;
