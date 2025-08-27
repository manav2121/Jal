const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, email, password });
    res.status(201).json({
      _id: user._id, name: user.name, email: user.email, role: user.role, token: signToken(user)
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const ok = await user.matchPassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });

    res.json({
      _id: user._id, name: user.name, email: user.email, role: user.role, token: signToken(user)
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// admin: list all users
router.get("/users", protect, admin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

module.exports = router;
