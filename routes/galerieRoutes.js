const express = require('express');
const router = express.Router();
const galerieController = require('../controllers/galerieController');
const upload = require('../config/multerConfig');
const authMiddleware = require('../middlewares/authMiddleware');
const View = require("../models/View");
const { protect } = require('../middlewares/protect');

// Routes publiques
router.get('/', galerieController.getGaleriesByCategorie);
router.get('/top', galerieController.getTopGaleries);
router.post('/:id/view', galerieController.trackView);
// Route protégée pour utilisateurs connectés
router.get('/:id', protect, galerieController.getGalerieById);

// Routes réservées aux administrateurs
router.post('/',
    upload.single('video'),
    galerieController.createGalerie
);

router.put('/:id', 
    upload.single('video'),
    galerieController.updateGalerie
);

router.delete('/:id', 
    galerieController.deleteGalerie
);



  
module.exports = router;