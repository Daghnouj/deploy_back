const User = require('../models/User');

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

module.exports = {
  getAllProfessionals,
  getFilterOptions
};