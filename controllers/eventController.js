const Event = require('../models/Event');
const fs = require('fs');
const path = require('path');

// CREATE
exports.createEvent = async (req, res) => {
  try {
    // Vérifier si les fichiers existent
    if (!req.files || req.files.length !== 4) {
      return res.status(400).json({ error: 'Il faut exactement 4 images.' });
    }

    // Vérifier que tous les fichiers proviennent du champ 'photo'
    const invalidFiles = req.files.some(file => file.fieldname !== 'photo');
    if (invalidFiles) {
      // Nettoyer les fichiers uploadés
      req.files.forEach(file => fs.unlinkSync(file.path));
      return res.status(400).json({ error: 'Champ de fichier invalide' });
    }
    const imagePaths = req.files.map(file => 'uploads/events/' + file.filename);

    const activities = JSON.parse(req.body.activities); // activities doit être JSON.stringify([])

    const event = new Event({
      name: req.body.name,
      images: imagePaths,
      address: req.body.address,
      coordinates: req.body.coordinates,
      activities,
      description: req.body.description
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// GET ALL
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// GET BY ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Événement non trouvé.' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// UPDATE
exports.updateEvent = async (req, res) => {
  try {
    const oldEvent = await Event.findById(req.params.id);
    if (!oldEvent) return res.status(404).json({ error: 'Événement non trouvé.' });

    let imagePaths = oldEvent.images;
    if (req.files && req.files.length === 4) {
      // Supprimer les anciennes images
      oldEvent.images.forEach(img => {
        const fullPath = path.join(__dirname, '..', img);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      });
      imagePaths = req.files.map(file => 'uploads/events/' + file.filename);
    }

    const activities = JSON.parse(req.body.activities);

    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        images: imagePaths,
        address: req.body.address,
        coordinates: req.body.coordinates,
        activities,
        description: req.body.description
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// DELETE
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Événement non trouvé.' });

    // Supprimer les images
    event.images.forEach(img => {
      const fullPath = path.join(__dirname, '..', img);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

    res.json({ message: 'Événement supprimé.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
