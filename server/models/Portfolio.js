const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  color: { type: String, default: '#2563eb' },
  status: {
    type: String,
    enum: ['on-track', 'at-risk', 'off-track', 'paused'],
    default: 'on-track'
  }
}, { timestamps: true });

portfolioSchema.index({ organization: 1, updatedAt: -1 });

module.exports = mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);
