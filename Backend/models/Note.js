const mongoose = require("mongoose");

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
  default: "todo"
}
   
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Note", noteSchema);