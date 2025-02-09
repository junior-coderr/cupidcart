const express = require("express");
const router = express.Router();
const userModel = require("../models/userModel");
const Order = require("../models/orderModel"); // Add this line
const {
  createUser,
  loginUserCtrl,
  getAllUsers,
  getaUser,
  deleteaUser,
  updateUser,
  handleRefreshToken,
  logout,
  forgotPassword,
  resetPassword,
  loginAdmin,
  // getWishlist,
  saveAddress,
  userCart,
  getUserCart,
  emptyCart,
  createOrder,
  updateOrderStatus,
  removeProductFromCart,
  getMyOrders,
  cancelOrder,
  sendVerification,
  verifyOTP,
} = require("../controller/userCtrl");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");
const { paymentverification, checkout } = require("../controller/paymentCtrl");

router.post("/send-verification", sendVerification);
router.post("/verify-otp", verifyOTP);

router.post("/register", createUser);
router.post("/login", loginUserCtrl);
router.post("/admin-login", loginAdmin);

router.get("/all-users", getAllUsers);
router.get("/refresh", handleRefreshToken);

// Update the getMyOrders route
router.get("/getmyorders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort("-createdAt")
      .populate({
        path: "orderItems",
        select: "name images quantity price",
      });

    res.json({ Orders: orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      message: "Error fetching orders",
      error: error.message,
    });
  }
});

// Add new route to get individual order details
router.get("/order/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate({
        path: "user",
        select: "mobile",
      })
      .populate({
        path: "orderItems",
        select: "name images quantity price",
      });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      message: "Error fetching order details",
      error: error.message,
    });
  }
});

router.get("/logout", logout);
// router.get("/wishlist", authMiddleware, getWishlist);
router.get("/cart", authMiddleware, getUserCart);
router.post("/add-to-cart", authMiddleware, userCart);
router.post("/order/checkout", authMiddleware, checkout);
router.post("/order/paymentVerification", authMiddleware, paymentverification);

router.put("/edit-user", authMiddleware, updateUser);

router.post("/forgotPassword", forgotPassword);
router.put("/resetPassword", resetPassword);

router.put(
  "/order/update-order/:id",
  authMiddleware,
  isAdmin,
  updateOrderStatus
);

router.put("/save-address", authMiddleware, saveAddress);
router.delete("/empty-cart", authMiddleware, emptyCart);
router.delete(
  "/delete-product-cart/:cartItemId",
  authMiddleware,
  removeProductFromCart
);
router.post("/cart/create-order", authMiddleware, createOrder);

// Add the cancel order route before the checkout route
router.put("/order/:id/cancel", authMiddleware, cancelOrder);

// Add new checkout route
router.get("/checkout", authMiddleware, async (req, res) => {
  try {
    // Check if user is authenticated and get user details if needed
    res.render("pages/checkout");
  } catch (error) {
    res.status(500).send({
      message: "Error loading checkout page",
      error: error.message,
    });
  }
});

// Update the profile endpoint
router.get("/profile", authMiddleware, (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    return res.json({
      _id: userId,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      email: req.user.email,
      mobile: req.user.mobile,
      role: req.user.role,
      address: req.user.address || "",
      city: req.user.city || "",
      pincode: req.user.pincode || "",
    });
  } catch (error) {
    // console.error("Profile route error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Place dynamic routes at the end
router.delete("/:id", deleteaUser);
router.get("/:id", authMiddleware, isAdmin, getaUser);

module.exports = router;
