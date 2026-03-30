const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  logo: { type: String, default: '' }, // URL to uploaded logo
  website: { type: String, default: '' },
  defaultProjectSettings: {
    defaultStatus: { type: String, default: 'To Do' },
    allowGuestAccess: { type: Boolean, default: false },
    requireApprovalToJoin: { type: Boolean, default: true }
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);