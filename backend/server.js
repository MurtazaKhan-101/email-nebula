const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("rate-limiter-flexible").RateLimiterMemory;
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const emailRoutes = require("./routes/emails");
const emailCampaignsRoutes = require("./routes/emailCampaigns");

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const rateLimiter = new rateLimit({
  keyPrefix: "middleware",
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

// Middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "https://email-nebula.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting (adjusted for serverless)
app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip || "anonymous");
    next();
  } catch (rejRes) {
    res.status(429).json({ error: "Too many requests" });
  }
});

// Routes
app.use("/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/campaigns", emailCampaignsRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Bulk Email Platform API",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server only if not in Vercel environment
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Bulk Email Platform Backend `);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
