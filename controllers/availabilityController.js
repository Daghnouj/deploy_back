const Availability = require('../models/Availability');
const User = require('../models/User');

// Créer une disponibilité
exports.addAvailability = async (req, res) => {
  try {
    const { summary, description, start, end } = req.body;
    const professional = req.user;

    if (!professional) {
      return res.status(400).json({ message: 'Professionnel non trouvé' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: 'Format de date invalide' });
    }
    
    if (startDate >= endDate) {
      return res.status(400).json({ message: 'La fin doit être après le début' });
    }

    const newAvailability = new Availability({
      user: professional._id,
      summary,
      description,
      start: startDate,
      end: endDate
    });

    const savedAvailability = await newAvailability.save();
    res.status(201).json(savedAvailability);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Récupérer les disponibilités filtrées
exports.getAvailabilities = async (req, res) => {
  try {
    const user = req.user;
    const { professionalId } = req.query;
    
    const query = {};
    
    if (professionalId) {
      query.user = professionalId;
    } else if (user && user.role === 'professional') {
      query.user = user._id;
    }

    const availabilities = await Availability.find(query)
      .populate('user', 'nom email role')
      .lean();

    const formattedEvents = availabilities.map(event => ({
      id: event._id.toString(),
      summary: event.summary,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      description: event.description,
      professional: event.user?.nom || 'Anonyme',
      email: event.user?.email || ''
    }));
    
    res.json(formattedEvents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Mettre à jour une disponibilité
exports.updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { summary, description, start, end } = req.body;

    // Validation des dates
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: 'Format de date invalide' });
    }

    const updatedAvailability = await Availability.findByIdAndUpdate(
      id,
      { summary, description, start: startDate, end: endDate },
      { new: true, runValidators: true }
    );

    if (!updatedAvailability) {
      return res.status(404).json({ message: 'Disponibilité non trouvée' });
    }

    res.json(updatedAvailability);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Supprimer une disponibilité
exports.deleteAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedAvailability = await Availability.findByIdAndDelete(id);
    
    if (!deletedAvailability) {
      return res.status(404).json({ message: 'Disponibilité non trouvée' });
    }

    res.json({ message: 'Disponibilité supprimée avec succès' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Récupérer les options de couleur
exports.getColorOptions = async (req, res) => {
  const colorOptions = [
    { value: '1', label: 'Lavande', hex: '#7986cb' },
    { value: '2', label: 'Sauge', hex: '#33b679' },
    { value: '3', label: 'Raisin', hex: '#8e24aa' },
    { value: '4', label: 'Paon', hex: '#e67c73' },
    { value: '5', label: 'Banane', hex: '#f6bf26' },
    { value: '6', label: 'Mandarine', hex: '#f4511e' },
    { value: '7', label: 'Canneberge', hex: '#039be5' },
    { value: '8', label: 'Flamboyant', hex: '#616161' },
    { value: '9', label: 'Océan', hex: '#3f51b5' },
    { value: '10', label: 'Basilic', hex: '#0b8043' },
    { value: '11', label: 'Mandarine foncée', hex: '#d60000' }
  ];

  res.json(colorOptions);
};

// Récupérer les professionnels vérifiés
exports.getProfessionals = async (req, res) => {
  try {
    const professionals = await User.find({ 
      role: 'professional',
      is_verified: true 
    }).select('nom email telephone');

    res.json(professionals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};