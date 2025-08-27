const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });

// Toggle debug logs in Render with AUTH_DEBUG=true (don’t log passwords)
const DEBUG = String(process.env.AUTH_DEBUG || "").toLowerCase() === "true";

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    let { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });

    email = String(email).trim().toLowerCase();

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, email, password });
    if (DEBUG) console.log("Signup user:", { id: user._id, email: user.email });

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email, role: user.role, token: signToken(user)
    });
  } catch (e) {
    if (DEBUG) console.error("Signup error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    email = String(email).trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      if (DEBUG) console.warn("Login not found:", { email });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const ok = await user.matchPassword(password);
    if (!ok) {
      if (DEBUG) console.warn("Login bad password:", { email, uid: user._id });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (DEBUG) console.log("Login success:", { email, uid: user._id });
    res.json({
      _id: user._id, name: user.name, email: user.email, role: user.role, token: signToken(user)
    });
  } catch (e) {
    if (DEBUG) console.error("Login error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// admin: list users (unchanged)
router.get("/users", async (req, res, next) => next(), require("../middleware/authMiddleware").protect, require("../middleware/authMiddleware").admin, async (_req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

module.exports = router;
