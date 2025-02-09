const error = require("mongoose/lib/error");
const userModel = require("../models/userModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const asyncHandler = require("express-async-handler"); // Add this line
const { generateToken } = require("../config/jwtToken");
const validateMongoDbId = require("../utils/validateMongodbId");
const { generateRefreshToken } = require("../config/refershToken");

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const uniqid = require("uniqid");
const dotenv = require("dotenv");
const orderModel = require("../models/orderModel");
const User = require("../models/userModel");
const {
  sendPasswordResetEmail,
  sendVerificationEmail,
} = require("../utils/emailService");
dotenv.config();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createUser = async (req, res) => {
  const { email, mobile } = req.body;
  try {
    const existingUser = await userModel.findOne({
      $or: [{ email: email }, { mobile: mobile }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "mobile number";
      return res.status(400).send({
        message: `This ${field} is already registered`,
      });
    }

    const newUser = await userModel.create(req.body);

    // Generate tokens for automatic login
    const refreshToken = await generateRefreshToken(newUser?._id);
    await userModel.findByIdAndUpdate(
      newUser._id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: process.env.JWT_EXPIRE * 1000, // Convert seconds to milliseconds
      secure: process.env.NODE_ENV === "production",
    });

    // Send response with login credentials
    res.status(200).send({
      message: "User Registered Successfully",
      _id: newUser?._id,
      firstname: newUser?.firstname,
      lastname: newUser?.lastname,
      email: newUser?.email,
      mobile: newUser?.mobile,
      token: generateToken(newUser?._id),
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Login a user
const loginUserCtrl = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Check if user exists
    const findUser = await userModel.findOne({ email });
    if (!findUser) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password using the schema method
    const isPasswordMatched = await findUser.isPasswordMatched(password);
    if (!isPasswordMatched) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(findUser._id);

    // Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    res.json({
      _id: findUser?._id,
      firstname: findUser?.firstname,
      lastname: findUser?.lastname,
      email: findUser?.email,
      mobile: findUser?.mobile,
      role: findUser?.role,
      token: token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
//AdminLogin
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  // check if user exists or not
  const findAdmin = await userModel.findOne({ email });
  if (findAdmin.role !== "admin") {
    res.status(500).send({
      msg: "Not Authorized person",
    });
  }
  if (findAdmin && (await findAdmin.isPasswordMatch(password))) {
    const refreshToken = await generateRefreshToken(findAdmin?._id);
    const updateuser = await User.findByIdAndUpdate(
      findAdmin.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: process.env.JWT_EXPIRE * 1000, // Convert seconds to milliseconds
      secure: process.env.NODE_ENV === "production",
    });
    res.status(200).send({
      _id: findAdmin?._id,
      firstname: findAdmin?.firstname,
      lastname: findAdmin?.lastname,
      email: findAdmin?.email,
      mobile: findAdmin?.mobile,
      token: generateToken(findAdmin?._id),
    });
  } else {
    res.status(500).send({
      msg: "Invalid credentials",
      error: error.msg,
    });
  }
};

//add to wishlist
// const getWishlist = async (req, res) => {
//   const { _id } = req.user;
//   try {
//     const findUser = await userModel.findById(_id).populate("wishlist");
//     res.status(200).send({
//       msg: "",
//       findUser,
//     });
//   } catch (error) {
//     res.status(500).send({
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

//save userAddress
const saveAddress = async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const updateUser = await findByIdAndUpdate(
      _id,
      {
        address: req?.body?.address,
      },
      {
        new: true,
      }
    );
    res.status(200).send({
      msg: "address updated Successfully",
      updateUser,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
//handle refresh Token
const handleRefreshToken = async (req, res) => {
  const cookie = req.cookies;
  console.log(cookie);
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in cookies");
  const refreshToken = cookie.refreshToken;
  console.log(refreshToken);
  const user = await userModel.findOne({ refreshToken });
  // res.json(user);
  if (!user) throw new Error(" No refresh token present in db or not matched");
  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    console.log(decoded);
    if (err || user.id !== decoded.id) {
      throw new Error(" There is something wrong in refersh token");
    }
    const accessToken = generateToken(user?._id);
    res.status(200).send({ accessToken });
  });
};
//get all users
const getAllUsers = async (req, res) => {
  try {
    let users = await userModel.find().populate("wishlist");
    res.status(200).send({
      message: "User Data Fetched Succesffully",
      users,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
//Get a Singleuser
const getaUser = async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const findUser = await userModel.findById(id);
    res.status(200).send({
      message: "User Data Fetched Succesffully",
      findUser,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// delete a user
const deleteaUser = async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const findUser = await userModel.findByIdAndDelete(id);
    res.status(200).send({
      message: "User Data Deleted Succesffully",
      findUser,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
//updata a user

const updateUser = async (req, res) => {
  const { _id } = req.user;

  if (!validateMongoDbId(_id)) {
    return res.status(400).send({
      message: "Invalid user ID",
    });
  }

  try {
    const updateuser = await userModel.findByIdAndUpdate(
      { _id },
      {
        firstname: req.body?.firstname,
        lastname: req.body?.lastname,
        email: req.body?.email,
        mobile: req.body?.mobile,
      },
      {
        new: true,
      }
    );

    if (!updateuser) {
      return res.status(404).send({
        message: "User not found",
      });
    }

    res.status(200).send(updateuser);
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
//logout user
const logout = async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in cookies");
  const refreshToken = cookie.refreshToken;
  const user = await userModel.findOne({ refreshToken });
  if (!user) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    res.status(204).send({ msg: "Logged out successfully" });
  }
  await userModel.findByIdAndUpdate(refreshToken, {
    refreshToken: "",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  res.status(200).send({ msg: "Logged out successfully" });
};

//forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    res.json({
      message: "Password reset code sent to your email",
      userId: user._id,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      message: "Error processing password reset request",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { userId, resetToken, newPassword } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Validate reset token
    if (!user.validatePasswordResetToken(resetToken)) {
      return res.status(400).json({
        message: "Invalid or expired reset code",
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    await user.save();

    res.json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      message: "Error resetting password",
      error: error.message,
    });
  }
};

//add to cart
const userCart = async (req, res) => {
  const { productId, quantity, price } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);
  console.log("usecart:", req.body, req.user);
  try {
    let newCart = await new Cart({
      userId: _id,
      productId,
      price,
      quantity,
    }).save();
    res.status(200).send({
      message: "",
      newCart,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getUserCart = async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const cart = await Cart.find({ userId: _id }).populate("productId");
    res.status(200).send({
      msg: "",
      cart,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const emptyCart = async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const user = await userModel.findOne({ _id });

    const cart = await Cart.deleteMany({});
    res.status(200).send({
      msg: "",
      cart,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const removeProductFromCart = async (req, res) => {
  const { _id } = req.user;
  const { cartItemId } = req.params;
  validateMongoDbId(_id);
  try {
    const deleteProduct = await Cart.deleteOne({
      userId: _id,
      _id: cartItemId,
    });
    res.status(200).send({
      msg: "item delted successfully",
      deleteProduct,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const createOrder = async (req, res) => {
  const { shippingInfo, orderItems, totalPrice, paymentInfo } = req.body;
  const { _id } = req.user;
  console.log("orderitems", req.body.orderItems);
  validateMongoDbId(_id);
  try {
    const order = await Order.create({
      shippingInfo,
      orderItems,
      totalPrice,
      paymentInfo,
      user: _id,
    });
    console.log("order.....>", order);
    res.status(200).send({
      order,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getMyOrders = async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const Orders = await Order.find({ user: _id })
      // .populate("user")
      .populate("orderItems")
      .exec();
    res.status(200).send({
      Orders,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const updateOrderStatus = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: status,
        paymentIntent: {
          status: status,
        },
      },
      { new: true }
    );
    res.status(200).send({
      updateOrderStatus,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).send({
        message: "Order not found",
      });
    }

    // Check if order can be cancelled
    if (
      order.orderStatus.toLowerCase() === "delivered" ||
      order.orderStatus.toLowerCase() === "cancelled"
    ) {
      return res.status(400).send({
        message: "Order cannot be cancelled",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: "Cancelled",
      },
      { new: true }
    );

    res.status(200).send({
      message: "Order cancelled successfully",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const sendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!req.session) {
      throw new Error("Session not initialized");
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification data in session
    req.session.emailVerification = {
      email,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    // Save session explicitly
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Send verification email
    await sendVerificationEmail(email, otp);

    res.json({
      message: "Verification code sent successfully",
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      message: "Failed to send verification code",
      error: error.message,
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Check verification data in session
    const verification = req.session.emailVerification;

    if (
      !verification ||
      verification.email !== email ||
      verification.otp !== otp
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code" });
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return res.status(400).json({ message: "Verification code expired" });
    }

    // Clear verification data from session
    delete req.session.emailVerification;

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
  getMyOrders,
  removeProductFromCart,
  cancelOrder,
  sendVerification,
  verifyOTP,
};
