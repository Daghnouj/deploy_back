const Event = require("../models/Event");
const geocoder = require('../config/geocoder')

// Exécuter le cleanup au démarrage
Event.cleanupOldIndexes().catch(console.error);

exports.createEvent = async (req, res) => {
  try {
    const { nom, date, adresse, description, organisateur, type, activitesCentres, localisationLink } = req.body;
    const photo = req.file?.path;

    // Validation des champs requis
    const requiredFields = { nom, date, adresse, type, activitesCentres };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Champs manquants : ${missingFields.join(', ')}`
      });
    }

    // Géocodage
    const geoResults = await geocoder.geocode(adresse);
    if (geoResults.length === 0) {
      return res.status(400).json({ message: "Adresse introuvable" });
    }

    let geoData;
    if (geoResults.length > 1) {
      return res.status(400).json({
        message: "Adresse ambigüe. Veuillez préciser :",
        suggestions: geoResults.slice(0, 3).map(r => r.formattedAddress)
      });
    } else {
      geoData = geoResults[0];
    }

    if (!geoData.longitude || !geoData.latitude) {
      return res.status(400).json({ 
        message: "Coordonnées GPS invalides pour cette adresse" 
      });
    }

    const newEvent = new Event({
      nom,
      date: new Date(date),
      adresse: geoData.formattedAddress,
      photo,
      description,
      organisateur,
      type,
      activitesCentres: Array.isArray(activitesCentres) 
        ? activitesCentres 
        : activitesCentres.split(',').map(a => a.trim()),
      localisationLink,
      localisation: {
        type: "Point",
        coordinates: [geoData.longitude, geoData.latitude]
      }
    });

    await newEvent.save();

    res.status(201).json({
      success: true,
      event: newEvent.toObject({ virtuals: true })
    });

  } catch (error) {
    console.error("Erreur createEvent:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        message: "Erreur de validation",
        errors
      });
    } 

    res.status(500).json({
      message: "Erreur serveur",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find().select('nom adresse activitesCentres type localisation localisationLink').lean();
    
    const villes = [...new Set(events.map(event => {
      const parts = event.adresse.split(',');
      return parts[parts.length - 1].trim();
    }))];

    res.status(200).json({ events, villes });
  } catch (error) {
    res.status(500).json({ message: "Erreur de récupération" });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Événement non trouvé" });
    res.status(200).json(event);
  } catch (error) {
    console.error("Erreur dans getEventById :", error);
    res.status(500).json({ message: "Erreur lors de la récupération de l'événement", error });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Événement non trouvé" });

    let coordinates = event.localisation.coordinates;
    
    if (req.body.adresse && req.body.adresse !== event.adresse) {
      const geoResults = await geocoder.geocode(req.body.adresse);
      if (geoResults.length === 0) {
        return res.status(400).json({ message: "Nouvelle adresse introuvable" });
      }
      coordinates = [geoResults[0].longitude, geoResults[0].latitude];
    }

    const updateData = {
      ...req.body,
      localisation: {
        type: "Point",
        coordinates
      },
      photo: req.file?.path || event.photo
    };

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    res.status(200).json({
      success: true,
      event: updatedEvent.toObject({ virtuals: true })
    });

  } catch (error) {
    console.error("Erreur dans updateEvent :", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'événement", error });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: "Événement non trouvé" });
    res.status(200).json({ message: "Événement supprimé avec succès" });
  } catch (error) {
    console.error("Erreur dans deleteEvent :", error);
    res.status(500).json({ message: "Erreur lors de la suppression de l'événement", error });
  }
};

exports.getNearbyEvents = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.query;
    
    const events = await Event.find({
      localisation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};