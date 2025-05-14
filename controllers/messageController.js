const Message = require("../models/Message.js");
const User = require("../models/User.js");
const mongoose = require("mongoose");
const { getReceiverSocketId, io } = require("../socket/socket.js");

const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // On exclut seulement le champ "mdp" (mot de passe)
    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-mdp")
      .lean();

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json([]);
  }
};

const getOnlineUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // Filtrer les utilisateurs en ligne en excluant également le champ "mdp"
    const users = await User.find({ 
      _id: { $ne: loggedInUserId },
      isOnline: true 
    })
      .select("-mdp")
      .lean();

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getOnlineUsersForSidebar:", error.message);
    res.status(500).json([]);
  }
};

const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

    const targetUser = await User.findById(userToChatId);
    if (!targetUser) {
      return res.status(404).json({ 
        success: false, 
        code: "USER_NOT_FOUND",
        message: "Utilisateur introuvable" 
      });
    }

    const query = {
      $or: [
        { senderId: new mongoose.Types.ObjectId(myId), receiverId: new mongoose.Types.ObjectId(userToChatId) },
        { senderId: new mongoose.Types.ObjectId(userToChatId), receiverId: new mongoose.Types.ObjectId(myId) }
      ]
    };

    const messages = await Message.find(query)
      .populate({
        path: 'senderId',
        select: '_id nom photo',
        transform: doc => {
          if (doc) {
            return {
              _id: doc._id.toString(),
              ...doc._doc,
              photo: doc.photo ? `${API_BASE_URL}/uploads/${doc.photo}` : null
            };
          }
          return doc;
        } 
      })
      .populate({
        path: 'receiverId',
        select: 'nom photo',
        transform: doc => {
          if (doc) {
            return {
              ...doc._doc,
              photo: doc.photo ? `${API_BASE_URL}/uploads/${doc.photo}` : null
            };
          }
          return doc;
        }
      })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, data: messages });
    
  } catch (error) {
    console.error(`[getMessages] Erreur:`, error);
    res.status(500).json({ success: false, code: "SERVER_ERROR" });
  }
};
// Dans le contrôleur sendMessage (backend)
const sendMessage = async (req, res) => {
  try {
    
    const { text, tempId } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;
    const io = req.io;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ 
        success: false, 
        code: "INVALID_RECEIVER" 
      });
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text?.trim(),
      image: req.file ? `${process.env.API_BASE_URL}/uploads/messages/${req.file.filename}` : null
    });

    const savedMessage = await newMessage.save();
    const populated = await savedMessage.populate([
      { path: 'senderId', select: 'nom photo' },
      { path: 'receiverId', select: 'nom photo' }
    ]);

    const responseData = {
      _id: savedMessage._id.toString(),
      tempId,
      text: populated.text,
      image: populated.image,
      createdAt: new Date().toISOString(),
      senderId: {
        _id: populated.senderId._id.toString(),
        nom: populated.senderId.nom,
        photo: populated.senderId.photo ? 
          `${process.env.API_BASE_URL}/uploads/${populated.senderId.photo}` : 
          `${process.env.API_BASE_URL}/default-avatar.png`
      },
      receiverId: {
        _id: populated.receiverId._id.toString(),
        nom: populated.receiverId.nom,
        photo: populated.receiverId.photo ? 
          `${process.env.API_BASE_URL}/uploads/${populated.receiverId.photo}` : 
          `${process.env.API_BASE_URL}/default-avatar.png`
      }
    };

    // Correction clé : Utilisation des rooms utilisateur
    io.to(senderId.toString()).emit('newMessage', responseData);
    io.to(receiverId.toString()).emit('newMessage', responseData);

    res.status(201).json({ success: true, data: responseData });

  } catch (error) {
    console.error('[sendMessage] Error:', error);
    res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: error.message
    });
  }
};

// Helper function
const formatPhotoUrl = (photo) => {
  return photo ? 
    `${process.env.API_BASE_URL}/uploads/${photo}` : 
    `${process.env.API_BASE_URL}/default-avatar.png`;
};
module.exports = { getUsersForSidebar, getMessages, sendMessage, getOnlineUsers };