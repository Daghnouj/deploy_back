# Utiliser l'image officielle Node.js version 18
FROM node:18

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de dépendances en premier pour optimiser le cache Docker
COPY package*.json ./

# Installer les dépendances avec npm ci pour un environnement de build propre
RUN npm ci

# Copier tout le reste du projet
COPY . .

# Exposer le port de ton serveur 
EXPOSE 5000

# Démarrer l’application
CMD ["npm", "start"]
