const express = require("express");
const router = express.Router();
const geminiChat = require("../chatbot/chatbot");

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({  
        success: false,
        error: "Message requis" 
      });
    }

    const response = await geminiChat(message);
    res.json({ 
      success: true, 
      reply: response 
    });
    
  } catch (err) {
    console.error("Erreur API:", err);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      details: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
});

module.exports = router;