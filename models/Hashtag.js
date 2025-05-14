const mongoose = require('mongoose');

const hashtagSchema = new mongoose.Schema({
  tag: { type: String, unique: true, required: true },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], 
  count: { type: Number, default: 1 } 
});

const Hashtag = mongoose.model('Hashtag', hashtagSchema);
module.exports = Hashtag;
