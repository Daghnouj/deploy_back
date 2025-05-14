const mongoose = require("mongoose");

const PartenaireSchema = new mongoose.Schema(
  {
    // Ajout du champ idpart avec une valeur par défaut unique
    idpart: {
      type: String,
      unique: true,
      default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    nom: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    telephone: { type: String },
    adresse: { type: String },
    description: { type: String },
    logo: { type: String },
    service: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Partenaire", PartenaireSchema);
