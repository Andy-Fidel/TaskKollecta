const mongoose = require('mongoose');

const productEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true,
  },
  eventName: {
    type: String,
    required: true,
    index: true,
  },
  source: {
    type: String,
    default: 'web',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

productEventSchema.index({ eventName: 1, createdAt: -1 });
productEventSchema.index({ organization: 1, eventName: 1, createdAt: -1 });

module.exports = mongoose.models.ProductEvent || mongoose.model('ProductEvent', productEventSchema);
