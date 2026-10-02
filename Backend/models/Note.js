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

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
    userEmail: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "todo",
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

module.exports = mongoose.model("Note", noteSchema);