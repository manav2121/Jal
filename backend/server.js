// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));

// DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

/**
 * Serve frontend only if the build exists.
 * This prevents: ENOENT: no such file or directory, .../frontend/build/index.html
 */
const clientBuild = path.join(__dirname, "../frontend/build");
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
} else {
  // Optional: health and help routes when frontend isn't bundled in this service
  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "backend",
      message:
        "Frontend build not found here. Deploy frontend as a Static Site or make this service build it during deploy.",
    });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
