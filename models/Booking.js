const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true },
  ville: { 
    type: String, 
    enum: [
      'Tunis', 'Ariana', 'Ben Arous', 'Manouba',
      'Nabeul', 'Zaghouan', 'Bizerte', 'Béja',
      'Jendouba', 'Le Kef', 'Siliana', 'Kairouan',
      'Kasserine', 'Sidi Bouzid', 'Sousse', 'Monastir',
      'Mahdia', 'Sfax', 'Gafsa', 'Tozeur',
      'Kébili', 'Gabès', 'Médenine', 'Tataouine'
    ],
    required: true 
  },
  antecedentsMedicaux: { 
    type: String, 
    enum: ['Diabète', 'Hypertension', 'Cardiaque', 'Autre'], 
    required: true 
  },
  probleme: { type: String, required: true },
  specialite: { type: String, required: true },
  therapeutename: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled' ,'completed'], 
    default: 'pending' 
  }
 

});

module.exports = mongoose.model('Booking', bookingSchema);
