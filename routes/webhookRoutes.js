const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const router = express.Router();

const endpointSecret = "whsec_QlYPuE0bBULTuwIuEXNqvuBPjO0HZMjq"; 

// Écoute les événements webhook de Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    // Vérifier la signature du webhook pour valider l'intégrité de l'événement
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log('Erreur de webhook:', err);
    return res.status(400).send(`Événement non valide: ${err.message}`);
  }

  // Traiter l'événement
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // La session est terminée avec succès, on peut maintenant enregistrer l'abonnement dans notre base
      await handleCheckoutSessionCompleted(session);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      // Un paiement a réussi, mettre à jour l'abonnement si nécessaire
      await handlePaymentSucceeded(invoice);
      break;
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      // Le paiement a échoué, gérer l'erreur si nécessaire
      await handlePaymentFailed(failedInvoice);
      break;
    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object;
      // L'abonnement a été annulé, mettre à jour le statut de l'abonnement
      await handleSubscriptionDeleted(subscriptionDeleted);
      break;
    case 'customer.subscription.updated':
      const subscriptionUpdated = event.data.object;
      // L'abonnement a été mis à jour, met à jour les informations
      await handleSubscriptionUpdated(subscriptionUpdated);
      break;
    default:
      console.log(`Événement non traité: ${event.type}`);
  }

  // Retourner une réponse 200 à Stripe pour confirmer que l'événement a été reçu
  res.json({ received: true });
});

// Fonction pour gérer l'événement 'checkout.session.completed'
async function handleCheckoutSessionCompleted(session) {
  const user = await User.findOne({ email: session.customer_email });
  if (!user) return console.log("Utilisateur introuvable");

  const subscription = new Subscription({
    user: user._id,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    plan: session.mode === "subscription" ? session.line_items.data[0].price.id : null,
    status: 'active',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Exemple de durée de 30 jours
  });

  await subscription.save();
  console.log("Abonnement créé avec succès");
}

// Fonction pour gérer l'événement 'invoice.payment_succeeded'
async function handlePaymentSucceeded(invoice) {
  // Ici, tu peux mettre à jour l'abonnement, envoyer un email de confirmation, etc.
  console.log("Paiement réussi pour la facture:", invoice.id);
}

// Fonction pour gérer l'événement 'invoice.payment_failed'
async function handlePaymentFailed(invoice) {
  console.log("Paiement échoué pour la facture:", invoice.id);
  // Tu peux notifier l'utilisateur ou suspendre l'abonnement
}

// Fonction pour gérer l'événement 'customer.subscription.deleted'
async function handleSubscriptionDeleted(subscription) {
  const subscriptionDoc = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
  if (subscriptionDoc) {
    subscriptionDoc.status = 'canceled';
    await subscriptionDoc.save();
    console.log("Abonnement annulé");
  }
}

// Fonction pour gérer l'événement 'customer.subscription.updated'
async function handleSubscriptionUpdated(subscription) {
  const subscriptionDoc = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
  if (subscriptionDoc) {
    subscriptionDoc.status = subscription.status;
    await subscriptionDoc.save();
    console.log("Abonnement mis à jour");
  }
}

module.exports = router;
