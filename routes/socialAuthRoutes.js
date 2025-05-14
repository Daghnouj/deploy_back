// routes/socialAuthRoutes.js
const express = require('express');
const passport = require('../config/passport');
const router = express.Router();

// Facebook Login
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

// Callback Facebook
router.get('/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    // À la réussite, vous pouvez renvoyer un token ou rediriger
    res.json({ message: "Connexion Facebook réussie", user: req.user });
  }
);

// Google Login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback Google
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.json({ message: "Connexion Google réussie", user: req.user });
  }
);

module.exports = router;
