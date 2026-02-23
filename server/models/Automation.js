const mongoose = require('mongoose');

const automationSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  
  // The Trigger
  triggerType: { 
    type: String, 
    enum: ['status_change', 'priority_change', 'task_overdue'], 
    required: true 
  },
  triggerValue: { type: String, required: true }, // e.g., 'done', 'urgent', or 'any' for overdue

  // The Action
  actionType: { 
    type: String, 
    enum: ['archive_task', 'assign_user', 'set_due_date', 'change_status', 'change_priority', 'send_notification'], 
    required: true 
  },
  actionValue: { type: String }, // status/priority value, user id, 'project_lead', 'assignee', etc.

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Automation', automationSchema);