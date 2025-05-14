const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Le prénom est obligatoire']
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est obligatoire']
  },
  email: {
    type: String,
    required: [true, "L'email est obligatoire"],
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  city: String,
  phone: {
    type: String,
    required: [true, 'Le téléphone est obligatoire']
  },
  subject: {
    type: String,
    required: [true, 'Le sujet est obligatoire']
  },
  message: {
    type: String,
    required: [true, 'Le message est obligatoire']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Contact', contactSchema);