const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  year: { type: Number },
  genre: { type: String },
  description: { type: String },
  director: { type: String },
  rating: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Movie", movieSchema);
