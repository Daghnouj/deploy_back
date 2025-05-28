const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  images: {
    type: [String],
    required: true,
    validate: {
      validator: (v) => v.length === 4,
      message: 'Il faut exactement 4 images.'
    }
  },
  address: { type: String, required: true },
  coordinates: String,
  activities: [{
    name: { type: String, required: true },
    day:  { type: String, required: true }
  }],
  description: { type: String, required: true }
});

module.exports = mongoose.model('Event', eventSchema);
