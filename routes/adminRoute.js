const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");

// Get dashboard stats
router.get("/stats", authMiddleware, isAdmin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalRevenue = await Order.aggregate([
      { $match: { orderStatus: "Delivered" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    res.json({
      totalOrders,
      totalUsers,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching dashboard stats",
      error: error.message,
    });
  }
});

// Get orders (recent or all)
router.get("/orders", authMiddleware, isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const orders = await Order.find()
      .sort("-createdAt")
      .limit(limit)
      .populate("user", "firstname lastname email")
      .populate("orderItems");

    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      user: {
        firstname: order.user?.firstname || "Unknown",
        lastname: order.user?.lastname || "User",
      },
      totalPrice: order.totalPrice,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      message: "Error fetching orders",
      error: error.message,
    });
  }
});

// Get all users
router.get("/users", authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("-password -refreshToken")
      .sort("-createdAt");

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
});

// Update order status
router.put("/orders/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        orderStatus: status,
        $push: {
          notes: {
            status: status,
            message: note.message,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({
      message: "Error updating order status",
      error: error.message,
    });
  }
});

// Get order details by ID
router.get("/orders/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "firstname lastname email mobile")
      .populate("orderItems");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    console.log("order", order);
    res.json(order);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching order details",
      error: error.message,
    });
  }
});

module.exports = router;
