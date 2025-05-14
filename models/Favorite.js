const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  date: { type: Date, default: Date.now }
});

const Favorite = mongoose.model('Favorite', favoriteSchema);
module.exports = Favorite;
