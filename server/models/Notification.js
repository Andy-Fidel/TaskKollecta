const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['task_assigned', 'task_status_change', 'new_comment', 'project_invite', 'automation', 'mention', 'due_date'], 
    required: true 
  },
  // We store a reference to the related entity (Task or Project)
  relatedId: { type: mongoose.Schema.Types.ObjectId, required: true }, 
  relatedModel: { type: String, enum: ['Task', 'Project'], required: true },
  relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  actionUrl: { type: String },
  dedupeKey: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  status: { type: String, enum: ['unread', 'read', 'archived'], default: 'unread' }
}, { timestamps: true });

notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
