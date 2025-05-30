const mongoose = require("mongoose");


const UserSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'], 
    trim: true
  },
   email: {
    type: String,
    required: true,
    index: {
      unique: true,
      partialFilterExpression: { oauthProvider: 'local' }
    }
  },
  mdp: { 
    type: String,
    required: function() {
      return !this.oauthProvider;  
    }
  },
  dateNaissance: Date,
  adresse: String,
  telephone: { 
    type: String,
    
  },
photo: { 
  type: String, 
  default: "default.png",
  
},
  role: { 
    type: String, 
    enum: ["patient", "professional"], 
    default: "patient" 
  },
   isActive: {
    type: Boolean,
    default: true
  },
  deactivatedAt: Date,
  isOnline: {  
    type: Boolean, 
    default: false 
  }, 
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastLogin: Date,
oauthProvider: { 
    type: String, 
    enum: ['local', 'google', 'facebook'], 
    default: 'local' 
  },
  oauthId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
    is_verified: {
    type: Boolean,
    default: function() {
      return this.role === "professional" ? false : true;
    }
  },
  specialite: { 
    type: String 
  },
stripeCustomerId: String,
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'trialing'],
    default: 'inactive'
  },
  plan: {
    type: String,
    enum: ['monthly', 'yearly', null],
    default: null
  },
  currentPeriodEnd: Date

  
}, { timestamps: true });


UserSchema.index(
  { oauthProvider: 1, oauthId: 1 },
  {  
    unique: true,
    partialFilterExpression: { 
      oauthId: { $exists: true, $ne: null } // Exclut les valeurs null
    }
  }
);

module.exports = mongoose.model("User", UserSchema);   