const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  // Sign payload with an object containing { id }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

module.exports = { generateToken };
