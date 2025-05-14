const express = require('express');
const { getAllProfessionals, getFilterOptions } = require('../controllers/professionalController');
const router = express.Router();

// GET all professionals
router.get('/', getAllProfessionals);
router.get('/filters', getFilterOptions);


module.exports = router; 