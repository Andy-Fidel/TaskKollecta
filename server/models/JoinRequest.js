const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

// Prevent duplicate requests
joinRequestSchema.index({ user: 1, organization: 1 }, { unique: true });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);