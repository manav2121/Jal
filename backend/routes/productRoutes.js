const express = require("express");
const Product = require("../models/product");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

// public: list products
router.get("/", async (_req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

// admin: add product
router.post("/", protect, admin, async (req, res) => {
  const { name, price } = req.body || {};
  if (!name || price == null) return res.status(400).json({ message: "Name and price required" });
  const product = await Product.create({ name, price });
  res.status(201).json(product);
});

// admin: delete product
router.delete("/:id", protect, admin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Product removed" });
});

module.exports = router;
