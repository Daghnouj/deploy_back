const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.nom,
      email: user.email,
      provider: user.oauthProvider,
      photo: user.photo
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

const generateAuthResponse = (user) => ({
  token: generateToken(user),
  user: {
    _id: user._id,
    name: user.nom,
    email: user.email,
    photo: user.photo,
    provider: user.oauthProvider,
    role: user.role
  }
});

// Configuration du modèle User nécessaire :
/*
UserSchema.index(
  { email: 1 },
  { 
    unique: true,
    partialFilterExpression: { oauthProvider: 'local' }
  }
);
UserSchema.index(
  { oauthProvider: 1, oauthId: 1 },
  { 
    unique: true,
    partialFilterExpression: { oauthId: { $exists: true } }
  }
);
*/

// Stratégie Google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback",
  proxy: true,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    
    // Vérifier l'existence du compte Google
    const existingUser = await User.findOne({
      oauthProvider: 'google',
      oauthId: profile.id
    });

    if (existingUser) {
      // Mise à jour des données si nécessaire
      existingUser.email = email;
      existingUser.photo = profile.photos[0].value.replace(/\?.*$/, '');
      existingUser.isOnline = true;
      await existingUser.save();
      return done(null, generateAuthResponse(existingUser));
    }

    // Création du nouvel utilisateur
    const newUser = new User({
      nom: profile.displayName,
      email,
      photo: profile.photos[0].value,
      oauthProvider: 'google',
      oauthId: profile.id,
      isOnline: true,
      is_verified: true
    });

    await newUser.save();
    done(null, generateAuthResponse(newUser));
  } catch (error) {
    handleAuthError(error, done);
  }
}));

// Stratégie Facebook
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
  enableProof: true
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`;
    
    // Vérifier l'existence du compte Facebook
    const existingUser = await User.findOne({
      oauthProvider: 'facebook',
      oauthId: profile.id
    });

    if (existingUser) {
      existingUser.email = email;
      existingUser.photo = profile.photos[0]?.value;
      existingUser.isOnline = true;
      await existingUser.save();
      return done(null, generateAuthResponse(existingUser));
    }

    // Création du nouvel utilisateur
    const newUser = new User({
      nom: profile.displayName,
      email,
      photo: profile.photos[0]?.value || "default.png",
      oauthProvider: 'facebook',
      oauthId: profile.id,
      isOnline: true, 
      is_verified: true
    });

    await newUser.save();
    done(null, generateAuthResponse(newUser));
  } catch (error) {
    handleAuthError(error, done);
  }
}));

// Stratégie Locale
passport.use('local', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ 
      email,
      oauthProvider: 'local' 
    });

    if (!user) return done(null, false, { message: 'Compte non trouvé' });
    if (!(await user.comparePassword(password))) {
      return done(null, false, { message: 'Mot de passe incorrect' });
    }
    
    done(null, generateAuthResponse(user));
  } catch (error) {
    handleAuthError(error, done);
  }
}));

// Gestionnaire d'erreurs unifié
function handleAuthError(error, done) {
  if (error.code === 11000) {
    const conflictField = Object.keys(error.keyPattern)[0];
    
    const errorMessages = {
      oauthId: 'Compte déjà associé à un autre utilisateur',
      email: 'Email déjà utilisé pour un compte local'
    };

    return done(new Error(errorMessages[conflictField] || 'Conflit de données'));
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(e => e.message);
    return done(new Error(messages.join(', ')));
  }

  done(new Error('Erreur d\'authentification'));
}

// Sérialisation
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;