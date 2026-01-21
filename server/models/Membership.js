const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member', 'guest'],
    default: 'member'
  }
}, { timestamps: true });

// Prevent a user from being added to the same Org twice
membershipSchema.index({ user: 1, organization: 1 }, { unique: true });

module.exports = mongoose.model('Membership', membershipSchema);