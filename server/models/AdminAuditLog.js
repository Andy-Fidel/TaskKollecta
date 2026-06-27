const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  targetModel: {
    type: String,
    default: 'User',
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  before: {
    type: mongoose.Schema.Types.Mixed,
  },
  after: {
    type: mongoose.Schema.Types.Mixed,
  },
  ip: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  correlationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
}, { timestamps: true });

module.exports = mongoose.models.AdminAuditLog || mongoose.model('AdminAuditLog', adminAuditLogSchema);
