const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    console.log('[Middleware] Headers:', req.headers); // Log des headers
    
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extraire le token
            token = req.headers.authorization.split(' ')[1];
            console.log('[Middleware] Token reçu:', token);

            // Vérifier le token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('[Middleware] Token décodé:', decoded);

            // Récupérer l'utilisateur sans le mot de passe
            const user = await User.findById(decoded.id).select('-mdp');
            
            if (!user) {
                console.error('[Middleware] Utilisateur non trouvé pour ID:', decoded.id);
                return res.status(401).json({ message: 'Non autorisé' });
            }

            // Ajouter l'utilisateur à la requête
            req.user = user;
            console.log('[Middleware] Utilisateur attaché:', user._id);
            
            next();
        } catch (error) {
            console.error('[Middleware] Erreur de vérification:', {
                message: error.message,
                stack: error.stack
            });
            res.status(401).json({ message: 'Non autorisé' });
        }
    }

    if (!token) {
        console.error('[Middleware] Aucun token trouvé');
        res.status(401).json({ message: 'Non autorisé, pas de token' });
    }
};

module.exports = { protect };