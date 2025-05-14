const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mdp: { type: String,required: function() {
    return !this.oauthProvider; // Requis seulement pour les non-OAuth
  }
},
  dateNaissance: Date,
  adresse: String,
  telephone: { type: String, unique: true, sparse: true },
  photo: { type: String, default: "default.png" },
  role: { type: String, enum: ["patient", "professional"], required: true ,
  default: "patient" 
  },
  isOnline: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },

  oauthProvider: String,
  oauthId: String,
//professionnel
  is_verified: {
    type: Boolean,
    default: false,
    required: function () {
      return this.role === "professional";
    },
  },
  specialite: { type: String },
});

module.exports = mongoose.model("User", UserSchema);
