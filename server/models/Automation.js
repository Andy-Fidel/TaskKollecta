const mongoose = require('mongoose');

const automationSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  
  // The Trigger
  triggerType: { 
    type: String, 
    enum: ['status_change', 'priority_change'], 
    required: true 
  },
  triggerValue: { type: String, required: true }, // e.g., 'done' or 'urgent'

  // The Action
  actionType: { 
    type: String, 
    enum: ['archive_task', 'assign_user', 'set_due_date'], 
    required: true 
  },
  actionValue: { type: String }, 

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Automation', automationSchema);