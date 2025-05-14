const mongoose = require("mongoose");

const viewSchema = new mongoose.Schema({
  galerieId: { type: mongoose.Schema.Types.ObjectId, ref: "Galerie", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

const View = mongoose.model("View", viewSchema);

module.exports = View;
