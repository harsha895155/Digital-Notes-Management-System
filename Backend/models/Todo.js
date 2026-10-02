const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    storageProvider: {
      type: String,
      default: "cloudinary",
    },
    resourceType: {
      type: String,
      default: "auto",
    },
    userEmail: {
      type: String,
      required: true,
    },
  },
  { _id: true }
);

const todoSchema = new mongoose.Schema(
  {
    task: {
      type: String,
      required: true,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    userEmail: {
      type: String,
      required: true,
    },

    taskDate: {
      type: String,
      required: true,
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Todo",
  todoSchema
);