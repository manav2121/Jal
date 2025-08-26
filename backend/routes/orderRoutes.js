const express = require("express");
const Order = require("../models/order");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// Create new order
router.post("/", protect, async (req, res) => {
  const { items, totalPrice } = req.body;

  // Validation
  if (!items || items.length === 0) return res.status(400).json({ message: "No items in order" });
  if (isNaN(totalPrice)) return res.status(400).json({ message: "Invalid totalPrice" });

  try {
    const order = new Order({
      user: req.user._id,
      items,
      totalPrice,
    });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get logged-in user's orders
router.get("/my-orders", protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
});

// Admin can see all orders
router.get("/", protect, admin, async (req, res) => {
  const orders = await Order.find().populate("user");
  res.json(orders);
});

module.exports = router;
