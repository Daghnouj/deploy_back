const express = require('express');
const router = express.Router();
const galerieController = require('../controllers/galerieController');
const { protect } = require('../middlewares/protect');

// Public routes
router.get('/', galerieController.getGaleriesByCategorie);
router.get('/total', galerieController.getTotalVideos); // New route
router.post('/:id/view', galerieController.trackView);

// Protected routes
router.get('/:id', protect, galerieController.getGalerieById);

// Admin routes
router.post('/', galerieController.createGalerie);
router.put('/:id', galerieController.updateGalerie);
router.delete('/:id', galerieController.deleteGalerie);

module.exports = router;