const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

// Prevent duplicate pending requests while preserving resolved history.
joinRequestSchema.index(
  { user: 1, organization: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

module.exports = mongoose.models.JoinRequest || mongoose.model('JoinRequest', joinRequestSchema);
