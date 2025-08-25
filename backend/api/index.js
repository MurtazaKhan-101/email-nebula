const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("rate-limiter-flexible").RateLimiterMemory;
require("dotenv").config();

// Initialize database
const db = require("../database/factory");

const authRoutes = require("../routes/auth");
const userRoutes = require("../routes/users");
const emailRoutes = require("../routes/emails");
const emailCampaignsRoutes = require("../routes/emailCampaigns");

const app = express();

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

// Apply rate limiting (reduced for serverless)
app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip || "anonymous");
    next();
  } catch (rejRes) {
    res.status(429).json({ error: "Too many requests" });
  }
});

// Initialize database on first request
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await db.init();
      dbInitialized = true;
      console.log("✅ Database initialized");
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      // Continue without MongoDB for now, will fall back to SQLite
    }
  }
  next();
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

// Export for Vercel - this is critical for serverless function
module.exports = app;

// Also export as default for compatibility
module.exports.default = app;
