const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stripeSubscriptionId: { type: String, required: true },
  status: { type: String, enum: ['active', 'past_due', 'canceled'], required: true },
  currentPeriodEnd: { type: Date, required: true },
  plan: { type: String, enum: ['monthly', 'yearly'], required: true }
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);