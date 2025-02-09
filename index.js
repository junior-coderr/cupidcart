const express = require("express");
const dbConnect = require("./config/dbConnect");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const app = express();
const dotenv = require("dotenv").config();

// Validate essential environment variables
if (!process.env.JWT_SECRET) {
  console.error(
    "FATAL ERROR: JWT_SECRET is not defined in environment variables."
  );
  process.exit(1);
}

const PORT = process.env.PORT || 4000;

const authRouter = require("./routes/authRoute");
const productRouter = require("./routes/productRoute");
const categoryRouter = require("./routes/categoryRoute");
const brandRouter = require("./routes/brandRoute");
const enqRouter = require("./routes/enqRoute");
const adminRouter = require("./routes/adminRoute");

const bodyParser = require("body-parser");
const error = require("mongoose/lib/error");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const { authMiddleware, isAdmin } = require("./middleware/authMiddleware");
const jwt = require("jsonwebtoken");

dbConnect();
app.use(morgan("dev"));

// Update CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

// Update session configuration to use dbUrl
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.dbUrl, // Changed to match .env variable name
      collectionName: "sessions",
      ttl: 60 * 10, // Session TTL (10 minutes)
      autoRemove: "native", // Enable automatic removal of expired sessions
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: "lax",
    },
    name: "sessionId",
  })
);

// Debug middleware for session
app.use((req, res, next) => {
  console.log("Session ID:", req.sessionID);
  console.log("Session Data:", req.session);
  next();
});

app.use("/user", authRouter);
app.use("/product", productRouter);
app.use("/category", categoryRouter);
app.use("/brand", brandRouter);
app.use("/enquiry", enqRouter);
app.use("/admin", adminRouter);

// Set EJS as templating engine
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Add routes for views
app.get("/", (req, res) => {
  res.render("pages/home");
});

app.get("/products", (req, res) => {
  res.render("pages/products");
});

app.get("/login", (req, res) => {
  res.render("pages/login");
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.get("/orders", (req, res) => {
  res.render("pages/orders");
});

// Add the order detail route
app.get("/order-detail", (req, res) => {
  res.render("pages/order-detail");
});

app.get("/checkout", (req, res) => {
  res.render("pages/checkout");
});

// Add admin dashboard route with both middlewares
app.get("/admin/dashboard", (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      throw new Error("Invalid token");
    }
    req.user = decoded;
    res.render("pages/admin-dashboard");
  } catch (error) {
    console.error("Token verification error:", error.message);
    res.clearCookie("token"); // Clear invalid token
    return res.redirect("/login");
  }
});

// Add admin order detail route
app.get("/admin/order-detail", (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.role !== "admin") {
      throw new Error("Unauthorized access");
    }
    res.render("pages/admin-order-detail");
  } catch (error) {
    console.error("Token verification error:", error.message);
    res.clearCookie("token"); // Clear invalid token
    return res.redirect("/login");
  }
});

app.listen(PORT, () => {
  console.log(`server is listening in ${PORT}`);
});
