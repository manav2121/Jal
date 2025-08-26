const express = require("express");
const Product = require("../models/product");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET all products
router.get("/", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// POST new product (admin only)
router.post("/", protect, admin, async (req, res) => {
  const { name, price } = req.body;
  const product = new Product({ name, price });
  await product.save();
  res.status(201).json(product);
});

// DELETE product by ID (admin only)
router.delete("/:id", protect, admin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Product removed" });
});

module.exports = router;
