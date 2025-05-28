const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  professional: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  specialite: { type: String, required: true },
  situation_professionnelle: { type: String },
  intitule_diplome: { type: String },
  nom_etablissement: { type: String },
  date_obtention_diplome: { type: Date },
  biographie: { type: String },
  document: { type: String },
  services: [{ type: String }],
}, { timestamps: true });  


module.exports = mongoose.model("Request", requestSchema);
