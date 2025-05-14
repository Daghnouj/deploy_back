const Booking = require('../models/Booking');
const User = require('../models/User');
const Availability = require('../models/Availability');
const mongoose = require('mongoose');

exports.getSpecialites = async (req, res) => {
  try {
    // Récupérer les spécialités uniques des professionnels vérifiés
    const specialites = await User.aggregate([
      {  
        $match: { 
          role: 'professional',
          is_verified: true,
          specialite: { $exists: true, $ne: null }
        }
      },
      { $group: { _id: '$specialite' } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: '$_id' } }
    ]);

    const result = specialites
      .map(s => s.name)
      .filter(name => name && name.trim() !== '');

    res.status(200).json(result);
  } catch (error) {
    console.error('Erreur dans getSpecialites:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message 
    });
  }
};
exports.getTherapistsBySpecialite = async (req, res) => {
  try {
    const { specialite } = req.params;
    
    // Corriger la validation et le matching exact
    if (!specialite || specialite.length < 2) {
      return res.status(400).json({ error: 'Spécialité invalide' });
    }

    const therapists = await User.find({
      role: 'professional',
      is_verified: true,
      specialite: { 
        $regex: new RegExp(`^${specialite}$`, 'i') // Matching exact insensible à la casse
      }
    }).select('_id nom ville specialite telephone');

    // Formater les données selon les besoins du frontend
    const result = therapists.map(t => ({
      id: t._id,
      nom: t.nom,
      ville: t.ville,
      specialite: t.specialite, // Ajouter ce champ
      telephone: t.telephone?.replace(/(\d{2})(?=\d)/g, '$1 ') || '' // Formater le numéro
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message
    });
  }
};
exports.getAvailableSlots = async (req, res) => {
  try {
    const { therapistId } = req.params;

    // 1. Trouver TOUTES les disponibilités du pro (sans filtre de date)
    const availabilities = await Availability.find({
      user: therapistId
    }).sort({ start: 1 });

    // 2. Formater la réponse
    const response = {
      meta: {
        count: availabilities.length,
        therapistId
      },
      data: availabilities.map(avail => ({
        id: avail._id,
        start: avail.start.toISOString(),
        end: avail.end.toISOString(),
        summary: avail.summary,
        duration: `${(avail.end - avail.start) / 60000} minutes`
      }))
    };

    res.status(200).json(response);

  } catch (error) {
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message
    });
  }
};


exports.submitBooking = async (req, res) => {
  try {
    const { therapistId, date } = req.body;
    const userId = req.user.id;

    // Validation des données
    if (!mongoose.Types.ObjectId.isValid(therapistId)) {
      return res.status(400).json({ error: 'ID de thérapeute invalide' });
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate)) {
      return res.status(400).json({ error: 'Date invalide' });
    }

    // Vérification de la disponibilité
    const availability = await Availability.findOne({
      user: therapistId,
      start: { $lte: bookingDate },
      end: { $gte: bookingDate }
    });

    if (!availability) {
      return res.status(400).json({ error: 'Créneau non disponible' });
    }

    // Vérification des conflits (NE PAS bloquer si c'est la même personne)
    const existingBooking = await Booking.findOne({
      therapistId,
      date: bookingDate,
      status: { $ne: 'cancelled' },
      userId: { $ne: userId } // <-- cette ligne permet de laisser passer si c'est le même user
    });

    if (existingBooking) {
      return res.status(409).json({ error: 'Créneau déjà réservé par une autre personne' });
    }

    // Création de la réservation
    const newBooking = new Booking({
      ...req.body,
      serviceName: req.body.name,
      userId,
      date: bookingDate
    });

    await newBooking.save();

    // Suppression du créneau (optionnel selon besoin métier)
    await Availability.deleteOne({ _id: availability._id });

    res.status(201).json({
      success: true,
      booking: {
        id: newBooking._id,
        therapistId: newBooking.therapistId,
        date: newBooking.date.toISOString(),
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Erreur dans submitBooking:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ errors });
    }

    res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    });
  }
};


exports.getBookingsForTherapist = async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      therapistId: req.user.id,
      status: 'pending' 
    }).populate('userId', 'name email');
    
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'cancelled'];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de réservation invalide' });
    }

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const booking = await Booking.findOneAndUpdate(
      { _id: id, therapistId: req.user.id },
      { status },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    // Correction ici : Ajout du champ summary requis
    if (status === 'cancelled') {
      await Availability.create({
        user: booking.therapistId,
        start: booking.date,
        end: new Date(booking.date.getTime() + 60*60*1000),
        summary: "Consultation annulée" // Champ requis ajouté
      });
    }

    res.status(200).json(booking);

  } catch (error) {
    console.error('Erreur dans updateBookingStatus:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message 
    });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('therapistId', 'nom prenom specialite')
      .sort({ date: -1 });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
};
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.user.id,
        status: { $in: ['pending', 'confirmed'] }
      },
      { status: 'cancelled' },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    // Libérer le créneau d'occupation
    await Availability.create({
      user: booking.therapistId,
      start: booking.date,
      end: new Date(booking.date.getTime() + 60*60*1000),
      summary: "Consultation annulée"
    });

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
