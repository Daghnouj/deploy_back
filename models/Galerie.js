const mongoose = require('mongoose');

const GalerieSchema = new mongoose.Schema({
  titre: { type: String, required: true, unique: true, sparse: true },
  desc: { type: String, required: true },
  video: { type: String, required: true },
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
  viewedBy: [{
    type: {
      type: String,
      enum: ['user', 'anon'],
      required: true,
      default: 'anon' // Valeur par défaut
    },
    id: String,
    session: String,
    ip: String,
    device: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
    createdAt: { type: Date, default: Date.now },
    viewCount: { // Champ virtuel calculé
      type: Number,
      default: 0,
      index: true // Index pour le tri rapide
    }
  
});
GalerieSchema.pre('save', function(next) {
  this.viewCount = this.viewedBy.length;
  next();
});
module.exports = mongoose.model('Galerie', GalerieSchema);