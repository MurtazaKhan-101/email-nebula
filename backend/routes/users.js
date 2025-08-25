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

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    console.log("👤 Getting profile for user ID:", req.user.userId);
    const user = await db.getUserById(req.user.userId);

    if (!user) {
      console.log("❌ User not found for ID:", req.user.userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ User found:", user.email);
    // Get Gmail connection status
    console.log("📧 Checking Gmail credentials for user ID:", req.user.userId);
    const gmailCreds = await db.getGmailCredentials(req.user.userId);
    console.log("📧 Gmail credentials found:", !!gmailCreds);

    res.json({
      success: true,
      user: {
        id: user._id || user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        gmailConnected: !!gmailCreds,
        gmailEmail: gmailCreds?.email,
        gmailConnectedAt: gmailCreds?.created_at,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get user profile" });
  }
});

// Update user profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }

    await db.updateUser(req.user.userId, { name: name.trim() });

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Get user's email campaigns
router.get("/campaigns", authenticateToken, async (req, res) => {
  try {
    const campaigns = await db.getUserCampaigns(req.user.userId);

    res.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Get campaigns error:", error);
    res.status(500).json({ error: "Failed to get campaigns" });
  }
});

// Get campaign details
router.get("/campaigns/:campaignId", authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await db.getCampaign(campaignId);

    if (!campaign || campaign.user_id !== req.user.userId) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Get email logs for this campaign
    const logs = await db.getCampaignLogs(campaignId);

    res.json({
      success: true,
      campaign: {
        ...campaign,
        logs,
      },
    });
  } catch (error) {
    console.error("Get campaign details error:", error);
    res.status(500).json({ error: "Failed to get campaign details" });
  }
});

// Delete campaign
router.delete("/campaigns/:campaignId", authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Check if campaign belongs to user
    const campaign = await db.getCampaign(campaignId);

    if (!campaign || campaign.user_id !== req.user.userId) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Delete campaign
    await db.deleteCampaign(campaignId);

    res.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("Delete campaign error:", error);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

module.exports = router;
