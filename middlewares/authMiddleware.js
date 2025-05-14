const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Request = require("../models/Request");


const authMiddleware = (options = {}) => {
    return (req, res, next) => {
        const authHeader = req.header("Authorization");
        
        // Vérification de la présence du token
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Accès refusé, aucun token fourni" });
        }

        const token = authHeader.split(" ")[1];

        try {
            // Vérification et décodage du JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("Token décodé :", decoded); 
            req.user = decoded;
            console.log("Utilisateur décodé :", req.user);
            // Vérification optionnelle du rôle admin
            if (options.adminOnly && decoded.role !== "admin") {
                return res.status(403).json({ message: "Accès réservé aux administrateurs" });
            }

            next();
        } catch (err) {
            // Gestion améliorée des erreurs JWT
            const errorMessage = err.name === "TokenExpiredError" 
                ? "Token expiré" 
                : "Token invalide";
            res.status(401).json({ message: errorMessage });
        }
    };
};

module.exports = authMiddleware;