const Notification = require('../models/Notification');

exports.getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort('-createdAt')
      .populate('sender', 'nom photo')
      .populate('post', 'content');

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Utilitaire pour réutiliser dans d'autres contrôleurs
exports.createNotification = async (recipientId, senderId, type, postId, metadata, io) => {
  try {
    // Vérification d'auto-like
    if (recipientId.toString() === senderId.toString()) {
      return null;
    }

    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      metadata
    });

    await notification.save();
    
    // Peuplement des données
    const populated = await Notification.populate(notification, [
      { path: 'sender', select: 'nom photo' },
      { path: 'post', select: 'content' }
    ]);

    // Vérification cruciale de l'instance Socket.IO
    if (io && typeof io.to === 'function') {
      io.to(recipientId.toString())
        .emit('new_notification', populated);
    } else {
      console.warn('Socket.IO non disponible pour notification');
    }

    return populated;

  } catch (error) {
    console.error('Notification error:', {
      error: error.message,
      stack: error.stack,
      recipientId,
      senderId
    });
    return null;
  }
};