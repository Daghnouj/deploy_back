const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  access_token: String,
  refresh_token: String,
  scope: String,
  token_type: String,
  expiry_date: Number,
});

module.exports = mongoose.model('Token', tokenSchema);
