const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    folders: {
      type: [folderSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ userEmail: 1, name: 1 });

module.exports = mongoose.model("Category", categorySchema);