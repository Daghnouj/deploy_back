const express = require('express');
const upload = require("../config/multerConfig.js");
const { getMessages, getUsersForSidebar, sendMessage, getOnlineUsers } = require("../controllers/messageController.js");
const { protect } = require("../middlewares/protect.js");

const router = express.Router();

router.get("/users", protect, getUsersForSidebar);
router.get("/online-users", protect, getOnlineUsers);
router.get("/:id", protect, getMessages);
router.post("/send/:id", protect, upload.single('messageImage'), sendMessage);


module.exports = router;
