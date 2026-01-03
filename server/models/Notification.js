const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['task_assigned', 'task_status_change', 'new_comment', 'project_invite'], 
    required: true 
  },
  // We store a reference to the related entity (Task or Project)
  relatedId: { type: mongoose.Schema.Types.ObjectId, required: true }, 
  relatedModel: { type: String, enum: ['Task', 'Project'], required: true },
  
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);