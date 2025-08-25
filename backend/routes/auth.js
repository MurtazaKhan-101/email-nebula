const express = require("express");
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../database/factory");
const Encryption = require("../utils/encryption");

const router = express.Router();

// Google OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate OAuth URL for Gmail access
router.get("/google/url", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/spreadsheets.readonly", // Add Google Sheets read access
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force consent to get refresh token
  });

  res.json({ authUrl: url });
});

// Handle OAuth callback (GET request from Google)
router.get("/google/callback", async (req, res) => {
  try {
    console.log("🔄 OAuth callback received", { query: req.query });
    const { code, error } = req.query;

    if (error) {
      console.error("❌ OAuth error:", error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed`
      );
    }

    if (!code) {
      console.error("❌ No OAuth code received");
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    console.log("🔐 Exchanging code for tokens...");
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log("👤 Getting user info from Google...");
    // Get user info from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    console.log("📧 User info received:", {
      email: userInfo.email,
      name: userInfo.name,
    });

    // Create or update user
    let user = await db.getUserByEmail(userInfo.email);

    if (!user) {
      console.log("👤 Creating new user...");
      const result = await db.createUser({
        email: userInfo.email,
        name: userInfo.name || userInfo.email,
      });
      const userId = result.id || result.insertedId;
      user = {
        id: typeof userId === "object" ? userId.toString() : userId,
        email: userInfo.email,
        name: userInfo.name || userInfo.email,
      };
    } else {
      console.log("👤 User exists, updating...");
      // Ensure consistent ID field - convert ObjectId to string if needed
      user.id = user.id || user._id;
      if (typeof user.id === "object" && user.id.toString) {
        user.id = user.id.toString();
      }
    }

    console.log("🔐 Storing Gmail credentials...");
    // Store Gmail credentials
    const encryptedAccessToken = Encryption.encryptToken(tokens.access_token);
    const encryptedRefreshToken = Encryption.encryptToken(tokens.refresh_token);

    await db.saveGmailCredentials({
      user_id: user.id,
      email: userInfo.email,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: new Date(Date.now() + (tokens.expiry_date || 3600000)),
      scope: tokens.scope,
      is_active: true,
    });

    console.log("🎫 Generating JWT token...");
    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const redirectUrl = `${
      process.env.FRONTEND_URL
    }/login?token=${jwtToken}&email=${encodeURIComponent(
      user.email
    )}&name=${encodeURIComponent(user.name)}`;

    console.log("↩️ Redirecting to frontend:", redirectUrl);

    // Redirect to frontend with token
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("💥 OAuth callback error:", error);
    console.error("Error stack:", error.stack);
    res.redirect(
      `${
        process.env.FRONTEND_URL
      }/login?error=auth_failed&details=${encodeURIComponent(error.message)}`
    );
  }
});

// Check Gmail connection status
router.get("/gmail/status", authenticateToken, async (req, res) => {
  try {
    console.log("📧 Checking Gmail status for user ID:", req.user.userId);
    const credentials = await db.getGmailCredentials(req.user.userId);
    console.log("📧 Gmail credentials found:", !!credentials);

    if (!credentials) {
      console.log("❌ No Gmail credentials found for user:", req.user.userId);
      return res.json({ connected: false });
    }

    // Check if token is expired
    const isExpired = new Date() > new Date(credentials.expires_at);

    res.json({
      connected: true,
      email: credentials.email,
      expired: isExpired,
      connectedAt: credentials.created_at,
    });
  } catch (error) {
    console.error("Gmail status check error:", error);
    res.status(500).json({ error: "Failed to check Gmail status" });
  }
});

// Refresh Gmail token
router.post("/gmail/refresh", authenticateToken, async (req, res) => {
  try {
    const credentials = await db.getGmailCredentials(req.user.userId);

    if (!credentials) {
      return res.status(404).json({ error: "No Gmail credentials found" });
    }

    // Decrypt refresh token
    let refreshToken;
    try {
      refreshToken = Encryption.decryptToken(credentials.refresh_token);
    } catch (error) {
      console.error("❌ Failed to decrypt refresh token:", error.message);
      return res.status(400).json({
        error: "Invalid stored credentials. Please re-authenticate with Gmail.",
        needsReauth: true,
      });
    }

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Refresh the access token
    const { credentials: newTokens } = await oauth2Client.refreshAccessToken();

    // Update stored credentials
    const encryptedAccessToken = Encryption.encryptToken(
      newTokens.access_token
    );

    await db.saveGmailCredentials({
      user_id: req.user.userId,
      email: credentials.email,
      access_token: encryptedAccessToken,
      refresh_token: credentials.refresh_token, // Keep existing refresh token
      expires_at: new Date(Date.now() + (newTokens.expiry_date || 3600000)),
      scope: credentials.scope,
      is_active: true,
    });

    res.json({ success: true, message: "Token refreshed successfully" });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// Disconnect Gmail
router.delete("/gmail/disconnect", authenticateToken, async (req, res) => {
  try {
    await db.disconnectGmail(req.user.userId);

    res.json({ success: true, message: "Gmail disconnected successfully" });
  } catch (error) {
    console.error("Gmail disconnect error:", error);
    res.status(500).json({ error: "Failed to disconnect Gmail" });
  }
});

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

module.exports = router;
