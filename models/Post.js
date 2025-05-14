// // models/Post.js
// const mongoose = require('mongoose');

// const postSchema = new mongoose.Schema({
//   content: { type: String, required: true },
//   likes: { type: Number, default: 0 },
//   likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
//   comments: [{
//     user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     text: { type: String },
//     date: { type: Date, default: Date.now }
//   }],
//   owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   avatar: { type: String, default: '/default-avatar.png' },
//  username: { type: String, required: true },
//   favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
//   hashtags: [{ type: String }],
//   date: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Post', postSchema);
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    content: { type: String, required: true },
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true 
    },
    username: { type: String, required: true },
    userPhoto: { type: String, default: 'default.png' },
    userRole: { 
        type: String, 
        enum: ['patient', 'professional'],
        required: true 
    },
    likes: { type: Number, default: 0 },
    likedBy: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' 
    }],
    comments: [{
      user: { 
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
      },
      text: {
          type: String,
          required: true,
          trim: true
      },
      date: { 
          type: Date, 
          default: Date.now 
      },
      edited: { type: Boolean, default: false },

      replies: [{
          user: { 
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
              required: true
          },
          text: {
              type: String,
              required: true,
              trim: true
          },
          date: { 
              type: Date, 
              default: Date.now 
          },
          edited: { type: Boolean, default: false },
      }]
    }],
    favorites: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' 
    }],
    hashtags: [{ type: String }],
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);