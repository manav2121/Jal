// backend/autoFixOrders.js
const mongoose = require("mongoose");
require("dotenv").config();

const Order = require("./models/order");
const User = require("./models/user");

const MONGO_URI = process.env.MONGO_URI;

const autoFixOrders = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all orders with missing user
    const orders = await Order.find({ $or: [{ user: null }, { user: { $exists: false } }] });
    console.log(`Found ${orders.length} orders with missing users.`);

    // Get admin user to assign as fallback
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) throw new Error("No admin user found. Create an admin first.");

    for (let order of orders) {
      // Try to find user based on email in order items (optional, if stored)
      // Example: if you stored email in items: const userEmail = order.items[0]?.email;
      // let user = userEmail ? await User.findOne({ email: userEmail }) : null;

      // For now, assign admin as fallback
      order.user = adminUser._id;
      await order.save();
      console.log(`✅ Order ${order._id} assigned to admin ${adminUser.name}`);
    }

    console.log("✅ All missing orders fixed.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

autoFixOrders();
