const mongoose = require("mongoose");
const AdminSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mdp: { type: String, required: true },
  role: { type: String, default: "admin" },
  phone: { type: String },
  photo: { type: String },
  otp: String,        
  otpExpires: Date

});
module.exports = mongoose.model("Admin", AdminSchema);