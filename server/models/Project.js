const mongoose = require('mongoose');

const DEFAULT_WORKFLOW_STATUSES = [
  { id: 'todo', label: 'To Do', color: '#64748b', order: 0, isDone: false },
  { id: 'in-progress', label: 'In Progress', color: '#3b82f6', order: 1, isDone: false },
  { id: 'review', label: 'Review', color: '#f59e0b', order: 2, isDone: false },
  { id: 'done', label: 'Done', color: '#22c55e', order: 3, isDone: true },
];

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'archived'],
    default: 'active'
  },
  startDate: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'editor', 'viewer'],
      default: 'editor'
    },
    addedAt: { type: Date, default: Date.now }
  }],
  color: {
    type: String,
    default: '#0f172a'
  },
  defaultView: {
    type: String,
    enum: ['list', 'board', 'timeline', 'calendar'],
    default: 'board'
  },
  workflowStatuses: {
    type: [{
      id: { type: String, required: true },
      label: { type: String, required: true },
      color: { type: String, default: '#64748b' },
      order: { type: Number, default: 0 },
      isDone: { type: Boolean, default: false },
      wipLimit: { type: Number, default: null }
    }],
    default: () => DEFAULT_WORKFLOW_STATUSES
  },
  customFields: [{
    key: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'multi-select', 'people', 'checkbox'],
      default: 'text'
    },
    options: [String],
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }],
  privacy: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  tags: [{
    name: String,
    color: String
  }],
  isTemplate: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
