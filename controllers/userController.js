const User = require("../models/User");
const bcrypt = require("bcrypt");

const mongoose = require("mongoose");

exports.getProfile = async (req, res) => {
  try {
    const user = req.user.toObject();
    
    // Formatage unique pour toutes les méthodes d'authentification
    const responseData = {
      _id: user._id,
      nom: user.nom,
      email: user.email,
      photo: user.photo || `${process.env.API_BASE_URL}/default-avatar.png`,
      role: user.role,
      authMethod: user.authMethod
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Erreur getProfile:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
// Récupérer le profil par ID
exports.getProfile = async (req, res) => {
  try {
    // Vérifier si l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }
     
    const userId = req.user._id;
    console.log("Tentative de récupération du profil pour l'utilisateur :", userId);

    // Valider l'ObjectId avant la requête
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID utilisateur invalide" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Erreur dans getProfile :', error);
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour le profil par ID
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Données reçues pour la mise à jour du profil:", req.body);
    const { email, nom, dateNaissance, adresse, telephone } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { email, nom, dateNaissance, adresse, telephone },
      { new: true }
    ).select("-mdp");

    console.log("Profil mis à jour avec succès:", user);
    res.json(user);
  } catch (error) {
    console.error("Erreur dans updateProfile:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Mettre à jour le mot de passe par ID
exports.updatePassword = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Données reçues pour la mise à jour du mot de passe:", req.body);
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Validation des entrées
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Les nouveaux mots de passe ne correspondent pas." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères." });
    }

    // Récupération de l'utilisateur avec le mot de passe (si stocké différemment)
    const user = await User.findById(userId).select('+mdp');
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Vérification de l'ancien mot de passe
    const isMatch = await bcrypt.compare(oldPassword, user.mdp);
    if (!isMatch) {
      return res.status(401).json({ message: "Ancien mot de passe incorrect." });
    }

    // Hash du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Mise à jour en désactivant la validation des autres champs
    await User.findByIdAndUpdate(
      userId,
      { mdp: hashedPassword },
      { 
        runValidators: false, // Désactive la validation globale
        context: 'query' // Nécessaire pour certaines versions de Mongoose
      }
    );

    console.log("Mot de passe mis à jour avec succès pour l'utilisateur:", userId);
    res.json({ message: "Mot de passe mis à jour avec succès." });

  } catch (error) {
    console.error("Erreur dans updatePassword:", error);
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour du mot de passe",
      error: error.message // Ne renvoyez que le message d'erreur pour la sécurité
    });
  }
};

// Mettre à jour la photo de profil par ID
exports.updateProfilePhoto = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Tentative de mise à jour de la photo de profil");
    if (!req.file) return res.status(400).json({ message: "Aucune image fournie" });

    const user = await User.findByIdAndUpdate(
      userId,
      { photo: req.file.filename },
      { new: true }
    ).select("-mdp");

    console.log("Photo de profil mise à jour avec succès:", user);
    res.json({ message: "Photo mise à jour", photo: user.photo });
  } catch (error) {
    console.error("Erreur dans updateProfilePhoto:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Supprimer le profil par ID
exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Tentative de suppression du profil de l'utilisateur:", userId);
    await User.findByIdAndDelete(userId);
    res.json({ message: "Compte supprimé avec succès" });
  } catch (error) {
    console.error("Erreur dans deleteProfile:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Désactiver le compte par ID
exports.deactivateAccount = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { password } = req.body;
    
    console.log("Tentative de désactivation du compte de l'utilisateur:", userId);
    
    // Vérifier le mot de passe si fourni
    if (password) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
      
      const isMatch = await bcrypt.compare(password, user.mdp);
      if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });
    }
    
    // Mettre à jour avec la date de désactivation
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { 
        isActive: false,
        deactivatedAt: new Date(),
        isOnline: false // Déconnecter l'utilisateur
      }, 
      { new: true }
    ).select("-mdp");
    
    if (!updatedUser) return res.status(404).json({ message: "Utilisateur non trouvé" });
    
    res.json({ 
      message: "Compte désactivé. Vous avez 2 mois pour le réactiver avant suppression définitive.", 
      user: updatedUser,
      deactivatedAt: updatedUser.deactivatedAt
    });
  } catch (error) {
    console.error("Erreur dans deactivateAccount:", error);
    res.status(500).json({ message: "Erreur lors de la désactivation du compte", error });
  }
};

// Activer le compte par ID
exports.activateAccount = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Tentative d'activation du compte de l'utilisateur:", userId);
    
    const user = await User.findByIdAndUpdate(
      userId, 
      { 
        isActive: true,
        deactivatedAt: null // Réinitialiser la date de désactivation
      }, 
      { new: true }
    ).select("-mdp");
    
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    
    res.json({ 
      message: "Compte activé avec succès.", 
      user 
    });
  } catch (error) {
    console.error("Erreur dans activateAccount:", error);
    res.status(500).json({ message: "Erreur lors de l'activation du compte", error });
  }
};

exports.getUserById = async (req, res) => {
  try {
      console.log('[USER] Tentative de récupération utilisateur ID:', req.params.id);
      
      const user = await User.findById(req.params.id).select('-mdp'); // Exclure le mot de passe
      
      if (!user) {
          console.log('[USER] Utilisateur non trouvé');
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      console.log('[USER] Utilisateur trouvé:', user.email);
      res.json(user);
      
  } catch (error) {
      console.error('[USER] Erreur serveur:', {
          message: error.message,
          stack: error.stack,
          params: req.params
      });
      res.status(500).json({ 
          message: 'Erreur serveur',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    console.log('[CURRENT USER] Récupération utilisateur connecté');
    
    const user = await User.findById(req.user._id)
      .select('-mdp -__v -createdAt -updatedAt')
      .lean();

    if (!user) {
      console.log('[CURRENT USER] Utilisateur non trouvé');
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Normalisation de l'ID et de l'URL de la photo
    const processedUser = {
      ...user,
      _id: user._id.toString(),
      photo: user.photo 
        ? `${process.env.API_BASE_URL}/uploads/${user.photo}`
        : `${process.env.API_BASE_URL}/default-avatar.png`
    };

    console.log('[CURRENT USER] Utilisateur trouvé:', processedUser.email);
    res.json(processedUser);

  } catch (error) {
    console.error('[CURRENT USER] Erreur serveur:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};