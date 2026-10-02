const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    username: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    profileImage: {
      type: String,
      default: "",
    },

    profileImageStorageKey: {
      type: String,
      default: "",
    },

    profileImageProvider: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive", "suspended"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);