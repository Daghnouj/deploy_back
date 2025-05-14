const jwt = require('jsonwebtoken');
const User = require('../models/User');

const userSocketMap = {};

const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new Error('Auth error');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) throw new Error('User not found');

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`✅ User ${userId} connected via socket ${socket.id}`);

    // Mise à jour des systèmes de présence et de messagerie
    userSocketMap[userId] = socket.id;
    socket.join(userId); // Rejoint la room utilisateur pour la messagerie

    // Émissions doubles pour les deux systèmes
    io.emit('presenceUpdate', { 
      userId,
      isOnline: true 
    });
    io.emit('onlineUsers', Object.keys(userSocketMap));

    socket.on('disconnect', () => {
      console.log(`❌ User ${userId} disconnected`);
      delete userSocketMap[userId];
      socket.leave(userId);
      
      // Nettoyage pour les deux systèmes
      io.emit('presenceUpdate', { 
        userId,
        isOnline: false 
      });
      io.emit('onlineUsers', Object.keys(userSocketMap));
    });
  });
};

const getReceiverSocketId = (userId) => userSocketMap[userId];

module.exports = { initSocket, getReceiverSocketId };