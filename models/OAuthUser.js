const mongoose = require("mongoose");

const OAuthUserSchema = new mongoose.Schema({
  oauthId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  oauthProvider: { 
    type: String, 
    enum: ["google", "facebook"], 
    required: true 
  },
  email: { 
    type: String, 
    required: true,
    unique: true 
  },
  nom: { 
    type: String, 
    required: true 
  },
  photo: {
    type: String,
    validate: {
      validator: function(v) {
        return /^(http|https|\/uploads)/.test(v);
      },
      message: props => `${props.value} n'est pas une URL valide!`
    }
  },
  is_verified: { 
    type: Boolean, 
    default: true 
  },
  role: { 
    type: String, 
    default: "patient" 
  },  
  createdAt: {  
    type: Date, 
    default: Date.now 
  }
});

OAuthUserSchema.index({ oauthProvider: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("OAuthUser", OAuthUserSchema);