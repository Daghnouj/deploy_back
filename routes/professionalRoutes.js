const express = require('express');
const { getAllProfessionals, getFilterOptions, getProfessionalById, updateProfessionalServices } = require('../controllers/professionalController');
const router = express.Router();

// GET all professionals
router.get('/', getAllProfessionals);
router.get('/filters', getFilterOptions); 
router.get('/:id', getProfessionalById);
router.put('/:professionalId/services', updateProfessionalServices);


module.exports = router; 