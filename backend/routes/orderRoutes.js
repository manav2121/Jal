const express = require("express");
const Order = require("../models/order");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

// user: create order
router.post("/", protect, async (req, res) => {
  const { items, totalPrice } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Items required" });
  if (typeof totalPrice !== "number" || isNaN(totalPrice)) return res.status(400).json({ message: "totalPrice must be a number" });

  const order = await Order.create({ user: req.user._id, items, totalPrice });
  res.status(201).json(order);
});

// user: my orders
router.get("/my-orders", protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// admin: all orders
router.get("/", protect, admin, async (_req, res) => {
  const orders = await Order.find().populate("user", "name email role").sort({ createdAt: -1 });
  res.json(orders);
});

module.exports = router;
