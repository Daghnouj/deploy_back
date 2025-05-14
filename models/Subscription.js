const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stripeCustomerId: { type: String, required: true },
  stripeSubscriptionId: { type: String, required: true },
  plan: { type: String, required: true },
  status: { type: String, enum: ['active', 'canceled', 'past_due'], default: 'active' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
