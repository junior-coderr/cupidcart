const mongoose = require("mongoose");

const validateMongoDbId = (id) => {
  if (!id) return false;
  const isValid = mongoose.Types.ObjectId.isValid(id);
  if (!isValid) {
    return false;
  }
  return true;
};

module.exports = validateMongoDbId;
