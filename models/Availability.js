const mongoose = require("mongoose");

const AvailabilitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  summary: {
    type: String, 
    default: "Disponibilité" 
    },
  description: String,
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  colorId: {
    type: String,
    default: '7'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}); 


module.exports = mongoose.model("Availability", AvailabilitySchema);