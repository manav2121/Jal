const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();

const DEBUG = String(process.env.AUTH_DEBUG || "").toLowerCase() === "true";

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });

// --- SIGNUP ---
router.post("/signup", async (req, res) => {
  try {
    let { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields (name, email, password) are required" });
    }

    email = String(email).trim().toLowerCase();

    // check existing
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name: String(name).trim(), email, password: String(password) });

    if (DEBUG) console.log("[SIGNUP OK]", { id: user._id.toString(), email: user.email });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: signToken(user),
    });
  } catch (e) {
    // Handle duplicate key + validation gracefully
    if (e && e.code === 11000) {
      if (DEBUG) console.warn("[SIGNUP DUPLICATE]", e.keyValue);
      return res.status(400).json({ message: "User already exists" });
    }
    if (e?.name === "ValidationError") {
      const first = Object.values(e.errors)[0]?.message || "Validation error";
      if (DEBUG) console.warn("[SIGNUP VALIDATION]", first);
      return res.status(400).json({ message: first });
    }
    if (DEBUG) console.error("[SIGNUP 500]", e);
    return res.status(500).json({ message: "Server error during signup" });
  }
});

// --- LOGIN ---
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    email = String(email).trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      if (DEBUG) console.warn("[LOGIN NOT FOUND]", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const ok = await user.matchPassword(password);
    if (!ok) {
      if (DEBUG) console.warn("[LOGIN BAD PASSWORD]", { email, id: user._id.toString() });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (DEBUG) console.log("[LOGIN OK]", { id: user._id.toString(), email: user.email });

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: signToken(user),
    });
  } catch (e) {
    if (DEBUG) console.error("[LOGIN 500]", e);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// (optional) admin: list users – keep as you had
const { protect, admin } = require("../middleware/authMiddleware");
router.get("/users", protect, admin, async (_req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

module.exports = router;
