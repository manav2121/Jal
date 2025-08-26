// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path"); // to serve frontend build

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// API Routes
app.use("/api/auth", require("./routes/authRoutes"));        // signup/login + admin user listing
app.use("/api/products", require("./routes/productRoutes")); // product CRUD
app.use("/api/orders", require("./routes/orderRoutes"));      // order CRUD

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build"))); // frontend build folder

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/build", "index.html"));
  });
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
