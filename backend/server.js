// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

// Light rate limit for OTP endpoints
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,                  // 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/otp", otpLimiter);

// API routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// (Optional) serve CRA build if present in this service
const clientBuild = path.join(__dirname, "../frontend/build");
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get("*", (_req, res) => res.sendFile(path.join(clientBuild, "index.html")));
} else {
  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "backend" });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
