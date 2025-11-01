// models/Note.js (Example)
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NoteSchema = new Schema(
  {
    childId: {
      type: Schema.Types.ObjectId,
      ref: "Child", // Reference to your Child model
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin", // Reference to your Admin model
      required: true,
    },
    adminName: {
      // Good to save this for easy display
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

module.exports = mongoose.model("Note", NoteSchema);