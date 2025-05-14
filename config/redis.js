const { createClient } = require('@redis/client');

// Créer un client Redis avec la nouvelle API
const redisClient = createClient({
 url: process.env.REDIS_URL, // Ex: 'redis://<user>:<password>@<host>:<port>'
  socket: {
    reconnectStrategy: retries => Math.min(retries * 100, 3000)
  }});

redisClient.on('error', (err) => {
  console.error('Erreur Redis:', err);
});

// Se connecter à Redis
redisClient.connect()
  .then(() => {
    console.log('Connexion réussie à Redis');
  })
  .catch((err) => {
    console.error('Erreur lors de la connexion à Redis:', err);
  });

module.exports = redisClient;