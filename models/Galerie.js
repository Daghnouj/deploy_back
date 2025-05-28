const mongoose = require('mongoose');

const GalerieSchema = new mongoose.Schema({
  titre: { type: String, required: true, unique: true, sparse: true },
  desc: { type: String, required: true },
  video: { type: String, required: true }, // Stores YouTube link
  categorie: { 
    type: String, 
    required: true,
    enum: [  
      "Bien-être Mental",
      "Gestion du Stress", 
      "Thérapies et Coaching",
      "Relations Sociales",
      "Développement Personnel"
    ] 
  },
  
  views: { type: Number, default: 0 }, 
  createdAt: { type: Date, default: Date.now },
  viewCount: {
    type: Number,
    default: 0,
    index: true
  }
});
module.exports = mongoose.model('Galerie', GalerieSchema);