const express = require("express");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// JWT generator
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    user = new User({ name, email, password });
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin-only: list all users
router.get("/users", protect, admin, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

module.exports = router;
