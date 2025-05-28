const express = require('express');
const router = express.Router();
const { 
  createCheckoutSession, 
  handleWebhook, 
  getSessionStatus // Import correct
} = require('../controllers/subscriptionController');
const { protect } = require('../middlewares/protect');

// Supprimer la route dupliquée
router.post('/create-session', protect, createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Conserver uniquement la version contrôlée
router.get('/session-status', protect, getSessionStatus);

module.exports = router;