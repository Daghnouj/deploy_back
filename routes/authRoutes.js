const express = require("express");
const router = express.Router();
const multer  = require("multer");
const User = require("../models/User");
const { google } = require('googleapis');
const Token = require('../models/Token');
const readline = require('readline');
require('dotenv').config();


const upload = multer({ dest: "uploads/" });
const authMiddleware = require("../middlewares/authMiddleware");
const authController = require("../controllers/authController");

console.log(authController); // Vérifier ce qui est réellement importé

const { signup, login, submitRequest } = authController;

// router.post("/signup", signup);
router.post("/login", login);
router.post("/request", authMiddleware, upload.single("document"), submitRequest);
router.post("/logout", authMiddleware, authController.logoutUser); 
router.post("/signup", upload.single('documents'), authController.signup);
// routes/auth.js
router.get('/me', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-mdp');
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  

module.exports = router;
