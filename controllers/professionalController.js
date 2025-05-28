const User = require('../models/User');
const mongoose = require('mongoose');
const Request = require('../models/Request');

const getAllProfessionals = async (req, res) => {
  try {
    const { specialty, location, search } = req.query;
    const query = { role: 'professional' };

    if (specialty) query.specialite = specialty;
    if (location) query.adresse = new RegExp(location, 'i');
    
    if (search) {
      query.$or = [
        { nom: new RegExp(search, 'i') },
        { specialite: new RegExp(search, 'i') },
        { bio: new RegExp(search, 'i') }
      ];
    }

    const professionals = await User.find(query);
    res.status(200).json(professionals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const specialties = await User.distinct('specialite', { role: 'professional' });
    const locations = await User.distinct('adresse', { role: 'professional' });
    res.status(200).json({ specialties, locations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfessionalById = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérification de la validité de l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Format d\'ID invalide' });
    }

    // Recherche du professionnel par ID et rôle
    const professional = await User.findOne({ 
      _id: id,
      role: 'professional' 
    });

    if (!professional) {
      return res.status(404).json({ message: 'Professionnel non trouvé' });
    }
// Récupération des données de la demande
    const professionalRequest = await Request.findOne({ 
      professional: id 
    });

    // Fusion des données
    const responseData = {
      ...professional.toObject(),
      ...(professionalRequest && {
        biographie: professionalRequest.biographie,
        services: professionalRequest.services, // Ajoutez ce champ dans votre schema Request si nécessaire
        situation_professionnelle: professionalRequest.situation_professionnelle,
        intitule_diplome: professionalRequest.intitule_diplome,
        nom_etablissement: professionalRequest.nom_etablissement
      })
    };

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const updateProfessionalServices = async (req, res) => {
  try {
    const { professionalId } = req.params;
    const { services } = req.body;

    // Vérifier si le professionnel existe
    const professional = await User.findById(professionalId);
    if (!professional || professional.role !== 'professional') {
      return res.status(404).json({ message: 'Professionnel non trouvé' });
    }

    // Mettre à jour ou créer la demande avec les services
    const request = await Request.findOneAndUpdate(
      { professional: professionalId },
      { services },
      { new: true, upsert: true }
    );

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports = {
  getAllProfessionals,
  getFilterOptions,
  getProfessionalById,
  updateProfessionalServices
};