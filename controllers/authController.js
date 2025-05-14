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
    const { email, mdp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Utilisateur non trouvé" });

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
      const pingResponse = await redisClient.ping();
      console.log('Ping Redis:', pingResponse);
  
      const authHeader = req.header("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(400).json({ msg: "Token manquant ou mal formaté" });
      }
      const token = authHeader.split(" ")[1];
  
      // Décoder le token pour obtenir l'ID utilisateur
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Mettre à jour le statut de l'utilisateur : offline
      await User.findByIdAndUpdate(decoded.id, { isOnline: false });
  
      const tokenExpiry = 3600;
      await redisClient.set(token, "blacklisted", { EX: tokenExpiry });
  
      return res.status(200).json({ msg: "Déconnexion réussie" });
    } catch (error) {
      console.error("Erreur lors du logout:", error);
      return res.status(500).json({ msg: "Erreur interne du serveur" });
    }
  };
  