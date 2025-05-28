const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Subscription = require('../models/Subscription');


exports.createCheckoutSession = async (req, res) => {
  try {
    const { plan } = req.body;
    const user = req.user;

    // Log de débogage
    console.log('[Subscription] Tentative de création de session pour :', {
      userId: user._id,
      plan: plan,
      stripeCustomerId: user.stripeCustomerId
    });

    // Validation du plan
    const PRICE_IDS = {
      monthly: process.env.STRIPE_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_YEARLY_PRICE_ID
    };

    if (!PRICE_IDS[plan]) {
      console.error('[Subscription] Plan invalide :', plan);
      return res.status(400).json({
        error: 'Plan invalide',
        validPlans: Object.keys(PRICE_IDS),
        receivedPlan: plan
      });
    }

    // Vérification de la configuration Stripe
    if (!PRICE_IDS.monthly || !PRICE_IDS.yearly) {
      console.error('[Subscription] Configuration Stripe manquante :', PRICE_IDS);
      return res.status(500).json({
        error: 'Configuration de paiement incomplète',
        details: 'Contactez le support technique'
      });
    }

    let customerId = user.stripeCustomerId;

    // Création du client Stripe si nécessaire
    if (!customerId) {
      console.log('[Subscription] Création nouveau client Stripe pour :', user.email);
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { 
          userId: user._id.toString(),
          internalId: user.internalId // Si existant
        }
      });
      customerId = customer.id;
      
      await User.findByIdAndUpdate(user._id, { 
        stripeCustomerId: customerId,
        $setOnInsert: { subscriptionStatus: 'pending' }
      }, { upsert: true });
    }

    // Création de la session Checkout
    console.log('[Subscription] Création session Stripe pour :', customerId);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customerId,
      line_items: [{
        price: PRICE_IDS[plan],
        quantity: 1
      }],
      subscription_data: {
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
        trial_period_days: 14
      },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription?canceled=true`,
      metadata: { 
        plan: plan,
        userId: user._id.toString()
      }
    });

    console.log('[Subscription] Session créée avec succès :', session.id);
    res.json({ 
      sessionId: session.id,
      url: session.url // Optionnel pour redirection manuelle
    });

  } catch (error) {
    console.error('[Subscription] Erreur critique:', {
      message: error.message,
      stack: error.stack,
      raw: error.raw || 'Non disponible'
    });
    
    res.status(500).json({
      error: 'Échec de la création du paiement',
      userMessage: 'Une erreur est survenue lors du traitement de votre demande',
      technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
  }

  res.json({ received: true });
};

// Helpers
async function handleCheckoutCompleted(session) {
  const user = await User.findOne({ stripeCustomerId: session.customer });
  if (!user) return;

  await User.findByIdAndUpdate(user._id, {
    subscriptionStatus: 'trialing'
  });
}

async function handlePaymentSucceeded(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const user = await User.findOne({ stripeCustomerId: invoice.customer });

  if (user) {
    // Utilisation des mêmes variables d'environnement que createCheckoutSession
    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: 'active',
      plan: subscription.items.data[0].price.id === monthlyPriceId ? 'monthly' : 'yearly',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    });

    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        user: user._id,
        status: subscription.status,
        plan: subscription.items.data[0].price.id === monthlyPriceId ? 'monthly' : 'yearly',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      },
      { upsert: true, new: true }
    );
  }
}

async function handleSubscriptionDeleted(subscription) {
  await User.findOneAndUpdate(
    { stripeCustomerId: subscription.customer },
    { subscriptionStatus: 'inactive', plan: null }
  );
  await Subscription.deleteOne({ stripeSubscriptionId: subscription.id });
}

exports.createPaymentIntent = async (req, res) => {
  try {
    const { planId } = req.body;
    const user = req.user;

    // Créer ou récupérer le client Stripe
    let customer;
    if (!user.stripeCustomerId) {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() }
      });
      await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
    } else {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    }

    // Créer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: planId === 'monthly' ? 2900 : 29900,
      currency: 'eur',
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      metadata: { planId }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSessionStatus = async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID manquant" });
    }

    // Utilisation correcte de l'API Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: "Paiement non accepté" });
    }

    res.json({
      status: session.payment_status,
      plan: session.metadata.plan,
      customer_email: session.customer_details.email
    });

  } catch (error) {
    console.error('Erreur Stripe:', error);
    res.status(500).json({ 
      error: "Erreur de vérification",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
};