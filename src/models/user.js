const mongoose = require("mongoose");
const validator = require("validator");

const User = mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error("Email is invalid");
      }
    },
  },
  password: {
    type: String,
    required: true,
  },
});
const model = mongoose.model("User", User);

module.exports = model;
