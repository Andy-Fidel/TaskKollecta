const mongoose = require('mongoose');

const retentionSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  auditLogDays: { type: Number, default: 365 },
  productEventDays: { type: Number, default: 730 },
  inactiveUserDays: { type: Number, default: 730 },
  deletedUserTombstoneDays: { type: Number, default: 30 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.models.RetentionSettings || mongoose.model('RetentionSettings', retentionSettingsSchema);
