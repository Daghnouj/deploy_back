const Post = require('../models/Post');
const mongoose = require('mongoose'); 
const Favorite = require('../models/Favorite');
const Hashtag = require('../models/Hashtag');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { createNotification } = require('./notificationController')

const extractHashtags = (content) => {
  const regex = /#([\wÀ-ÿ]+)/g; // Gestion des accents
  const matches = [...content.matchAll(regex)];
  if (!matches.length) return [];
  
  return [...new Set(
      matches.map(match => match[1].toLowerCase()) // Récupère uniquement le texte après #
  )];
};

// Version corrigée du contrôleur de création de post
const createPost = async (req, res) => {
  try {
      const { content } = req.body;
      
      if (!req.user) {
          return res.status(401).json({ message: 'Non autorisé' });
      }

      // Extraction des hashtags
      const hashtags = extractHashtags(content);
      
      const newPost = new Post({
          content,
          user: req.user._id,
          username: req.user.nom,
          userPhoto: req.user.photo,
          userRole: req.user.role,
          hashtags // Stocke les hashtags sans #
      });

      await newPost.save();

      // Mise à jour asynchrone des hashtags
      if (hashtags.length > 0) {
          const bulkOps = hashtags.map(tag => ({
              updateOne: {
                  filter: { name: tag },
                  update: { $inc: { count: 1 }, $setOnInsert: { name: tag } },
                  upsert: true
              }
          }));
          
          await Hashtag.bulkWrite(bulkOps, { ordered: false });
      }

      res.status(201).json({
          success: true,
          post: {
              ...newPost._doc,
              user: {
                  _id: req.user._id,
                  nom: req.user.nom,
                  photo: req.user.photo,
                  role: req.user.role
              }
          }
      });

  } catch (error) {
      console.error('Erreur création de post:', {
          error: error.message,
          stack: error.stack,
          user: req.user?._id
      });
      
      res.status(500).json({
          success: false,
          message: 'Erreur serveur',
          error: process.env.NODE_ENV === 'development' ? error.message : null
      });
  }
}; 

const addLike = async (req, res) => {
  const postId = req.params?.postId;

  try {
    const userId = req.user._id;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: 'postId est requis dans les paramètres de la requête'
      });
    }

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Format de postId invalide' 
      });
    }

    const post = await Post.findById(postId)
      .select('content user likedBy likes')
      .populate('user', '_id')
      .lean();

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post introuvable' 
      });
    }

    const isLiking = !post.likedBy.some(id => id.equals(userId));
    
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        $inc: { likes: isLiking ? 1 : -1 },
        [isLiking ? '$addToSet' : '$pull']: { likedBy: userId }
      },
      { new: true, select: 'likes likedBy' }
    );

    // Vérification centrale de req.io
    if (!req.io) {
      console.error("[ERREUR] Socket.IO non initialisé");
    }

    if (isLiking) {
      if (!post.user._id.equals(userId)) {
        // Création de notification avec vérification io
        await createNotification(
          post.user._id,
          userId,
          'like',
          postId,
          { postPreview: post.content?.slice(0, 50) },
          req.io // Passé uniquement si disponible
        );
      }
    } else {
      const deletedNotif = await Notification.findOneAndDelete({
        recipient: post.user._id,
        sender: userId,
        type: 'like',
        post: postId
      });
      
      // Émission conditionnelle
      if (deletedNotif && req.io) {
        req.io.to(post.user._id.toString())
           .emit('remove_notification', deletedNotif._id);
      }
    }

    res.json({
      success: true,
      post: updatedPost
    });

  } catch (error) {
    console.error('[ERREUR LIKE]', {
      error: error.message,
      stack: error.stack,
      postId,
      userId: req.user?._id
    });
    res.status(500).json({ 
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Erreur serveur'
    });
  }
};
  const addComment = async (req, res) => {
    try {
      const { postId } = req.params;
      const { comment } = req.body;
      const userId = req.user._id;
  
      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ success: false, message: 'Post non trouvé' });
  
      const newComment = {
        user: userId,
        text: comment.trim(),
        date: new Date()
      };
  
      post.comments.push(newComment);
      await post.save();
  
      if (post.user.toString() !== userId.toString()) {
        await createNotification(
          post.user,   // destinataire
          userId,      // auteur du commentaire
          'comment',
          postId,
          {
            commentId: post.comments[post.comments.length - 1]._id,
            commentPreview: comment.slice(0, 50)
          },
          req.io
        );
      }
  
      const populatedPost = await Post.findById(postId)
        .populate('comments.user', 'nom photo');
  
      res.status(201).json({
        success: true,
        comment: populatedPost.comments[populatedPost.comments.length - 1]
      });
  
    } catch (error) {
      console.error('Erreur commentaire:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  };
  
  const addReply = async (req, res) => {
    try {
      const { postId, commentId } = req.params;
      const { replyText } = req.body;
      const userId = req.user._id;
  
      const post = await Post.findById(postId);
      const comment = post.comments.id(commentId);
  
      const newReply = {
        user: userId,
        text: replyText.trim(),
        date: new Date()
      };
  
      comment.replies.push(newReply);
      await post.save();
      if (comment.user.toString() !== userId.toString()) {
      await createNotification(
        comment.user,
        userId,
        'reply',
        postId,
        { 
        commentId: commentId,
        replyId: comment.replies[comment.replies.length - 1]._id,
        replyPreview: replyText.slice(0, 50)
        },
        req.io
      );
    }
      const populatedPost = await Post.findById(postId)
        .populate('comments.replies.user', 'nom photo');
  
      res.status(201).json({
        success: true,
        reply: populatedPost.comments.id(commentId).replies.slice(-1)[0]
      });
  
    } catch (error) {
      console.error('Erreur réponse:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  };
// Modification d'un commentaire
const updateComment = async (req, res) => {
    const { postId, commentId } = req.params;
    const { newText } = req.body;
    const userId = req.user._id;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ success: false, message: 'Post non trouvé' });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Commentaire non trouvé' });

        // Vérification de l'auteur
        if (!comment.user.equals(userId)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Non autorisé à modifier ce commentaire' 
            });
        }

        comment.text = newText.trim();
        comment.edited = true; // Ajoutez ce champ au schéma
        await post.save();

        res.json({ 
            success: true,
            comment: await Post.populate(comment, { path: 'user', select: 'nom photo' })
        });

    } catch (error) {
        console.error('Erreur modification commentaire:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erreur serveur',
            error: error.message 
        });
    }
};

// Suppression d'un commentaire
const deleteComment = async (req, res) => {
  const { postId, commentId } = req.params;
  const userId = req.user._id;

  try {
      const post = await Post.findById(postId);
      let deletedComment = null;

      post.comments = post.comments.filter(c => {
          if (c._id.toString() === commentId) {
              if (!c.user.equals(userId)) {
                  throw new Error('Non autorisé');
              }
              deletedComment = c;
              return false;
          }
          return true;
      });

      await post.save();

      // Suppression de la notification associée
      if (deletedComment) {
          const deletedNotif = await Notification.findOneAndDelete({
              type: 'comment',
              'metadata.commentId': mongoose.Types.ObjectId(commentId), // Conversion en ObjectId
              post: mongoose.Types.ObjectId(postId) // Conversion en ObjectId
          });

          if (deletedNotif && req.io) {
              req.io.to(deletedNotif.recipient.toString())
                 .emit('remove_notification', deletedNotif._id);
          }
      }

      res.json({ success: true, message: 'Commentaire supprimé' });

    } catch (error) {
        const status = error.message === 'Non autorisé' ? 403 : 500;
        res.status(status).json({ 
            success: false,
            message: error.message === 'Non autorisé' 
                ? 'Non autorisé à supprimer ce commentaire' 
                : 'Erreur serveur'
        });
    }
};

// Modification d'une réponse
const updateReply = async (req, res) => {
    const { postId, commentId, replyId } = req.params;
    const { newText } = req.body;
    const userId = req.user._id;

    try {
        const post = await Post.findById(postId);
        const comment = post.comments.id(commentId);
        const reply = comment.replies.id(replyId);

        if (!reply.user.equals(userId)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Non autorisé à modifier cette réponse' 
            });
        }

        reply.text = newText.trim();
        reply.edited = true;
        await post.save();

        res.json({ 
            success: true,
            reply: await Post.populate(reply, { path: 'user', select: 'nom photo' })
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Erreur serveur',
            error: error.message 
        });
    }
};

// Suppression d'une réponse
const deleteReply = async (req, res) => {
  const { postId, commentId, replyId } = req.params;
  const userId = req.user._id;

  try {
      const post = await Post.findById(postId);
      const comment = post.comments.id(commentId);
      let deletedReply = null;

      comment.replies = comment.replies.filter(r => {
          if (r._id.toString() === replyId) {
              if (!r.user.equals(userId)) throw new Error('Non autorisé');
              deletedReply = r;
              return false;
          }
          return true;
      });

      await post.save();

      // Suppression de la notification associée
      if (deletedReply) {
          const deletedNotif = await Notification.findOneAndDelete({
              type: 'reply',
              'metadata.commentId': mongoose.Types.ObjectId(commentId), // Conversion
              'metadata.replyId': mongoose.Types.ObjectId(replyId), // Conversion
              post: mongoose.Types.ObjectId(postId) // Conversion
          });

          if (deletedNotif && req.io) {
              req.io.to(deletedNotif.recipient.toString())
                 .emit('remove_notification', deletedNotif._id);
          }
      }

      res.json({ success: true, message: 'Réponse supprimée' });


    } catch (error) {
        const status = error.message === 'Non autorisé' ? 403 : 500;
        res.status(status).json({ 
            success: false,
            message: error.message === 'Non autorisé' 
                ? 'Non autorisé à supprimer cette réponse' 
                : 'Erreur serveur'
        });
    }
};

// const getAllPosts = async (req, res) => {
//     try {
//         const posts = await Post.find().sort({ date: -1 });
//         res.json(posts);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };
// Récupérer tous les posts avec les infos utilisateur
const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('user', 'nom photo role')
            .populate({
                path: 'comments.user',
                select: 'nom photo'
            })
            .populate({
                path: 'comments.replies.user',
                select: 'nom photo'
            })
            .sort({ date: -1 });
        
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
const toggleFavorite = async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post non trouvé' });

      const index = post.favorites.indexOf(userId);
      if (index !== -1) {
          post.favorites.splice(index, 1);
          await post.save();
          res.json({ message: 'Favori retiré' });
      } else {
          post.favorites.push(userId);
          await post.save();
          res.json({ message: 'Ajouté aux favoris' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur serveur' });
  }
};

const getPopularHashtags = async (req, res) => {
  try {
      const hashtags = await Post.aggregate([
          { $unwind: "$hashtags" },
          { $group: { 
              _id: "$hashtags", 
              count: { $sum: 1 } 
          }},
          { $sort: { count: -1 } },
          { $limit: 3 }
      ]);
      res.json(hashtags);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
};

const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post non trouvé' });
    }

    if (!post.user.equals(userId)) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    // Extraction des anciens et nouveaux hashtags
    const oldHashtags = post.hashtags;
    const newHashtags = extractHashtags(content);

    // Mise à jour du post
    post.content = content;
    post.hashtags = newHashtags;
    post.edited = true;
    await post.save();

    // Gestion des différences de hashtags
    const addedHashtags = newHashtags.filter(tag => !oldHashtags.includes(tag));
    const removedHashtags = oldHashtags.filter(tag => !newHashtags.includes(tag));

    // Mise à jour des hashtags
    if (addedHashtags.length > 0) {
      const addOps = addedHashtags.map(tag => ({
        updateOne: {
          filter: { name: tag },
          update: { $inc: { count: 1 }, $setOnInsert: { name: tag } },
          upsert: true
        }
      }));
      await Hashtag.bulkWrite(addOps);
    }

    if (removedHashtags.length > 0) {
      const removeOps = removedHashtags.map(tag => ({
        updateOne: {
          filter: { name: tag },
          update: { $inc: { count: -1 } }
        }
      }));
      await Hashtag.bulkWrite(removeOps);
      
      // Nettoyage des hashtags inutilisés
      await Hashtag.deleteMany({ count: { $lte: 0 } });
    }

    res.json({ 
      success: true,
      post: await Post.findById(postId).populate('user', 'nom photo role')
    });

  } catch (error) {
    console.error('Erreur modification post:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post non trouvé' });
    }

    if (!post.user.equals(userId)) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const postHashtags = post.hashtags;

    // Suppression du post
    await Post.deleteOne({ _id: postId });

    // Mise à jour des hashtags
    if (postHashtags.length > 0) {
      await Hashtag.updateMany(
        { name: { $in: postHashtags } },
        { $inc: { count: -1 } }
      );
      await Hashtag.deleteMany({ count: { $lte: 0 } });
    }

    // Suppression des favoris associés
    await Favorite.deleteMany({ post: postId });

    // Suppression des notifications associées
    await Notification.deleteMany({ post: postId });

    res.json({ success: true, message: 'Post supprimé avec succès' });

  } catch (error) {
    console.error('Erreur suppression post:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};

const searchPosts = async (req, res) => {
  try {
    const { query } = req.query;
    const cleanQuery = query.replace(/#/g, ''); // Nettoyage du #
    const searchRegex = new RegExp(cleanQuery, 'i');

    const posts = await Post.find({
      $or: [
        { content: searchRegex },
        { hashtags: searchRegex }
      ]
    })
    .populate({
      path: 'user',
      select: 'nom photo role',
      transform: (doc) => ({
        ...doc._doc,
        photo: doc.photo ? doc.photo : null
      })
    })
    .sort({ date: -1 });

    res.json(posts);
  } catch (error) {
    console.error('Erreur recherche:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
const deleteFavorite = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post non trouvé' 
      });
    }

    // Vérifie si l'utilisateur a déjà mis en favori
    const favoriteIndex = post.favorites.indexOf(userId);
    
    if (favoriteIndex === -1) {
      return res.status(400).json({ 
        success: false, 
        message: "Ce post n'est pas dans vos favoris" 
      });
    }

    // Supprime le favori
    post.favorites.splice(favoriteIndex, 1);
    await post.save();

    res.json({ 
      success: true, 
      message: 'Favori supprimé avec succès',
      favorites: post.favorites
    });

  } catch (error) {
    console.error('Erreur suppression favori:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};
module.exports = {
    createPost,
    addLike,
    addComment,
    getAllPosts,
    toggleFavorite,
    getPopularHashtags,
    addReply ,
    updateComment,
    deleteComment,
    updateReply,
    deleteReply,
    deletePost,
    updatePost,
    searchPosts,
};