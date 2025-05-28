const express = require('express');

const { 
    createPost, 
    addLike, 
    addComment, 
    getAllPosts, 
    toggleFavorite, 
    getPopularHashtags, 
    addReply,
    updateComment, 
    deleteComment, 
    updateReply, 
    deleteReply,
    updatePost,
    deletePost,
    searchPosts
} = require('../controllers/postController');
const { protect } = require('../middlewares/protect');

const router = express.Router();

// Routes publiques (sans auth middleware)
router.post('/addPost', protect, createPost);
router.post('/:postId/like', protect, addLike);
router.post('/:postId/comment', protect, addComment);
router.post( '/:postId/comments/:commentId/reply',  protect, addReply);
router.get('/posts', getAllPosts);
router.post('/:postId/favorite', toggleFavorite);
router.get('/hashtags/popular', getPopularHashtags);
router.put('/:postId', protect, updatePost);
router.delete('/:postId', protect, deletePost);
router.get('/search', searchPosts);

router.put('/:postId/comments/:commentId', protect, updateComment);
router.delete('/:postId/comments/:commentId', protect, deleteComment);
router.put('/:postId/comments/:commentId/replies/:replyId', protect, updateReply);
router.delete('/:postId/comments/:commentId/replies/:replyId', protect, deleteReply);
module.exports = router; 