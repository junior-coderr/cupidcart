const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  // Debug logs
  console.log("Headers:", req.headers);
  console.log("Authorization header:", req.headers.authorization);
  console.log("Cookies:", req.cookies);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log("Extracted token:", token);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);

      const user = await User.findById(decoded.id || decoded._id);
      if (!user) {
        console.log("User not found");
        return res.status(401).json({ message: "User not found" });
      }

      console.log("auth middleware called");

      req.user = user;
      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({
        message: "Not authorized, token failed",
        error: error.message,
      });
    }
  } else {
    console.log("No token found in authorization header");
    return res.status(401).json({ message: "Not authorized, no token" });
  }
});

const isAdmin = async (req, res, next) => {
  try {
    console.log("isAdmin middleware called");
    const { email } = req.user;
    const adminUser = await User.findOne({ email });

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin privileges required.",
      });
    }
    console.log("Admin user verified:", adminUser);
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    return res.status(500).json({
      message: "Error verifying admin status",
      error: error.message,
    });
  }
};

module.exports = { authMiddleware, isAdmin };
