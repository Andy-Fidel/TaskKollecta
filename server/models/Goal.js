const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  title: { type: String, required: true },
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
  targetDate: Date,
  status: {
    type: String,
    enum: ['on-track', 'at-risk', 'off-track', 'achieved', 'paused'],
    default: 'on-track'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  linkedProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  linkedTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }]
}, { timestamps: true });

goalSchema.index({ organization: 1, updatedAt: -1 });

module.exports = mongoose.models.Goal || mongoose.model('Goal', goalSchema);
