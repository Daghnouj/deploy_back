const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Request = require("../models/Request");



exports.signup = async (req, res) => {
  try {
    const { nom, email, mdp, dateNaissance, adresse, telephone, role, specialite, situation_professionnelle, intitule_diplome, nom_etablissement, date_obtention_diplome, biographie } = req.body;
    const document = req.file ? req.file.path : null;

    if (!mdp) {
      return res.status(400).json({ message: "Mot de passe requis." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà." });
    }

    const hashedPassword = await bcrypt.hash(mdp, 10);
    
    // Ajout de la spécialité dans le modèle User
    const userData = {
      nom,
      email,
      mdp: hashedPassword,
      dateNaissance,
      adresse,
      telephone,
      role,
      is_verified: role === "professional" ? false : true,
    };

    // Si c'est un professionnel, ajouter la spécialité
    if (role === "professional") {
      userData.specialite = specialite;
    }

    const user = new User(userData);
    await user.save(); 

    if (role === "professional") {
      if (!document) {
        return res.status(400).json({ message: "Document professionnel requis." });
      }

      const requestDoc = new Request({
        professional: user._id,
        specialite, 
        situation_professionnelle,
        intitule_diplome,
        nom_etablissement,
        date_obtention_diplome,
        biographie,
        document 
      });

      await requestDoc.save();
      return res.status(201).json({ message: "Demande soumise avec succès, en attente de validation." });
    }

    res.status(201).json({ message: "Compte créé avec succès !" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'inscription", error });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, mdp,reactivate  } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Utilisateur non trouvé" });

    if (!user) return res.status(400).json({ message: "Utilisateur non trouvé" });
    if (!user.isActive) {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      if (user.deactivatedAt && user.deactivatedAt > twoMonthsAgo) {
        if (reactivate) {
          user.isActive = true;
          user.deactivatedAt = undefined;
          await user.save();
        } else {
          return res.status(403).json({ 
            message: "Votre compte est désactivé. Souhaitez-vous le réactiver ?",
            canReactivate: true 
          });
        }
      } else {
        return res.status(403).json({ 
          message: "Compte désactivé depuis plus de 2 mois. Réactivation impossible." 
        });
      }
    }
    const isMatch = await bcrypt.compare(mdp, user.mdp);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });

    // Si l'utilisateur est professionnel et non validé, ne pas générer de token
    if (user.role === "professional" && !user.is_verified) {
      return res.status(403).json({ 
        message: "Votre compte professionnel est en attente de validation par l'administrateur." 
      });
    }

    // Générer un token uniquement si l'utilisateur est validé
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Mise à jour de la dernière connexion et du statut online
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date(), isOnline: true });

    res.json({ token, role: user.role  });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la connexion", error });
  }
};


  exports.submitRequest = async (req, res) => {
    try {
      const { specialite, situation_professionnelle, intitule_diplome, nom_etablissement, date_obtention_diplome, biographie } = req.body;
  
      const userId = req.user.id;
      const user = await User.findById(userId);
  
      if (user.role !== "professional") {
        return res.status(400).json({ message: "L'utilisateur n'est pas un professionnel" });
      }
  
      const existingRequest = await Request.findOne({ professional: userId });
      if (existingRequest) {
        return res.status(400).json({ message: "Demande déjà soumise" });
      }
  
      const requestDoc = new Request({
        professional: userId,
        specialite,
        situation_professionnelle,
        intitule_diplome,
        nom_etablissement,
        date_obtention_diplome,
        biographie,
        document: req.file ? req.file.path : null,
      });
  
      await requestDoc.save();
      res.status(201).json({ message: "Demande soumise avec succès, en attente de validation par l'administrateur." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur lors de la soumission de la demande", error });
    }
  };

exports.logoutUser = async (req, res) => {
  try {
    // Utilisation de l'utilisateur attaché par le middleware
    await User.findByIdAndUpdate(
      req.user.id,
      { 
    isOnline: false,
    lastLogin: Date.now() 
  },
  { 
    runValidators: true, 
    new: true 
  }
    );

    res.clearCookie("token");
    return res.status(200).json({ message: "Déconnexion réussie" });

  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return res.status(500).json({ 
      message: "Erreur serveur",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};