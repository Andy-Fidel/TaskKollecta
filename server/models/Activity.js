const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // Link to Project (for project-level activity feeds)
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true // Index for project activity lookups
  },

  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    index: true // Index for task history lookups
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  action: {
    type: String,
    required: true
  },

  details: { type: String }
}, { timestamps: true });

// Compound indexes for paginated queries
activitySchema.index({ task: 1, createdAt: -1 }); // Task history (newest first)
activitySchema.index({ project: 1, createdAt: -1 }); // Project feed (newest first)

module.exports = mongoose.model('Activity', activitySchema);