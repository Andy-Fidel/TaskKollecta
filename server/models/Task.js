const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: { type: Date },

  // RELATIONS
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assigneeEmail: { type: String },  // For unregistered/non-member assignees
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    name: String,
    color: String
  }],
  attachments: [{
    url: String,
    filename: String,
    type: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  subtasks: [{
    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false }
  }],

  // RECURRENCE
  recurrence: {
    enabled: { type: Boolean, default: false },
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'custom'],
      default: 'weekly'
    },
    interval: { type: Number, default: 1 }, // Every X days/weeks/months
    daysOfWeek: [{ type: Number }], // 0-6 for weekly patterns
    endDate: { type: Date }, // Optional end date for recurrence
    lastGenerated: { type: Date } // Track when last instance was created
  },
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // Link to recurring parent

  archived: { type: Boolean, default: false },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
}, { timestamps: true });

// Indexes for common queries
taskSchema.index({ project: 1, status: 1 }); // Tasks by project and status (kanban)
taskSchema.index({ assignee: 1, status: 1 }); // My tasks
taskSchema.index({ project: 1, createdAt: -1 }); // Project tasks sorted by date
taskSchema.index({ dueDate: 1 }); // Calendar view / overdue queries
taskSchema.index({ organization: 1 }); // Org-scoped queries

module.exports = mongoose.model('Task', taskSchema);