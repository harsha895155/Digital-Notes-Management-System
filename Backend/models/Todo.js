const mongoose = require("mongoose");

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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Todo",
  todoSchema
);