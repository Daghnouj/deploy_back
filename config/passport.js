const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const jwt = require("jsonwebtoken");
const OAuthUser = require("../models/OAuthUser");

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      name: user.nom,
      email: user.email,
      photo: user.photo
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}; 

// Stratégie Google corrigée
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:5000/auth/google/callback",
  proxy: true
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error("Email requis"));

    // Nettoyage de l'URL de la photo Google
    const cleanGooglePhoto = profile.photos[0].value.replace(/\?.*$/, '');

    let user = await OAuthUser.findOne({
      $or: [
        { oauthId: profile.id },
        { email: email }
      ]
    });

    if (!user) {
      user = new OAuthUser({
        nom: profile.displayName,
        email,
        photo: cleanGooglePhoto, // URL nettoyée
        oauthProvider: 'google',
        oauthId: profile.id,
        is_verified: true,
        role: "patient"
      });
      await user.save();
    }

    const token = generateToken(user);
    return done(null, {
      token,
      role: user.role,
      user: {
        name: user.nom,
        email: user.email,
        photo: user.photo
      }
    });
  } catch (error) {
    return done(error);
  }
}));

// Stratégie Facebook
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "http://localhost:5000/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
  scope: ['email'],
  enableProof: true
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`;

    let user = await OAuthUser.findOne({
      $or: [
        { oauthId: profile.id },
        { email: email }
      ]
    });

    if (!user) {
      user = new OAuthUser({
        nom: profile.displayName || profile.name.givenName,
        email,
        photo: profile.photos[0].value || "default.png",
        oauthProvider: 'facebook',
        oauthId: profile.id,
        is_verified: true,
        role: "patient"
      });
      await user.save();
    }

    const token = generateToken(user);
    return done(null, {
      token,
      role: user.role,
      user: {
        name: user.nom,
        email: user.email,
        photo: user.photo
      }
    });
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((obj, done) => done(null, obj));

module.exports = passport;