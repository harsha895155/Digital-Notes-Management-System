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
      default: "",
    },
  },
  { _id: true }
);

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    folder: {
      type: String,
      default: "",
      trim: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      default: "todo",
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    isShared: {
      type: Boolean,
      default: false,
      index: true,
    },
    shares: [
      {
        userEmail: {
          type: String,
          required: true,
          lowercase: true,
          trim: true,
        },
        permission: {
          type: String,
          enum: ["viewer", "editor"],
          default: "viewer",
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    activity: [
      {
        action: { type: String, required: true },
        userEmail: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    reminderTime: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    reminderMinutesBefore: {
      type: Number,
      default: 0,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    aiSummary: {
      summary: { type: String, default: "" },
      summaryType: { type: String, default: "" },
      generatedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ userEmail: 1, createdAt: -1 });
noteSchema.index({ userEmail: 1, category: 1 });
noteSchema.index({ "shares.userEmail": 1 });
noteSchema.index({ title: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Note", noteSchema);