const mongoose = require("mongoose");
require("dotenv").config();

const dbConnect = () => {
  try {
    // Use dbUrl instead of MONGODB_URL to match .env
    const conn = mongoose.connect(process.env.dbUrl);
    console.log("DB Connected Successfully");
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
};

module.exports = dbConnect;
