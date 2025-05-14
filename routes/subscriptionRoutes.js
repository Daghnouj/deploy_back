const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Subscription = require("../models/Subscription");
const User = require("../models/User");

const router = express.Router();

// 🎯 Route pour créer une session Stripe Checkout
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { userId, plan } = req.body;

    // 1️⃣ Vérifier si l'utilisateur existe et a le rôle "professional"
    const user = await User.findById(userId);
    if (!user || user.role !== "professional") {
      return res.status(400).json({ message: "Utilisateur invalide ou non thérapeute" });
    }

    // 2️⃣ Définir les plans Stripe
    const planPrices = {
      monthly: "price_1QxFhrCAZn4DtT6kqn8MQxT7",  
      yearly: "price_1QxFiICAZn4DtT6kUC31FHxw",    
    };

    if (!planPrices[plan]) {
      return res.status(400).json({ message: "Plan non valide" });
    }

    // 3️⃣ Créer une session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: planPrices[plan], quantity: 1 }],
      success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/cancel`,
    });

    console.log("✅ Session Stripe créée :", session.id); 
    res.json({ url: session.url });
  } catch (error) {
    console.error("❌ Erreur Stripe :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// 🎯 Route pour gérer la redirection après succès du paiement
router.get("/success", async (req, res) => {
  try {
    console.log("🔍 Query params reçus:", req.query);
    const sessionId = req.query.session_id;
    if (!sessionId) {
      console.error("❌ Session ID manquant !");
      return res.status(400).json({ message: "Session ID manquant" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "line_items.data.price.product"],
    });

    console.log("✅ Session Stripe récupérée :", session);
    res.redirect("http://localhost:3000/dashboard");
  } catch (error) {
    console.error("❌ Erreur Stripe :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});


module.exports = router;
