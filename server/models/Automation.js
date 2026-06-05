const mongoose = require('mongoose');

const triggerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['status_change', 'priority_change', 'task_overdue', 'task_created', 'due_date_set', 'due_date_changed', 'custom_field_change'],
    required: true
  },
  value: { type: String, default: 'any' },
  fieldKey: { type: String }
}, { _id: false });

const conditionSchema = new mongoose.Schema({
  field: {
    type: String,
    enum: ['status', 'priority', 'assignee', 'dueDate', 'isMilestone', 'customField'],
    required: true
  },
  operator: {
    type: String,
    enum: ['equals', 'not_equals', 'exists', 'not_exists'],
    default: 'equals'
  },
  value: { type: mongoose.Schema.Types.Mixed },
  fieldKey: { type: String }
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['archive_task', 'assign_user', 'set_due_date', 'change_status', 'change_priority', 'send_notification', 'add_comment', 'create_subtask', 'set_custom_field'],
    required: true
  },
  value: { type: mongoose.Schema.Types.Mixed },
  fieldKey: { type: String }
}, { _id: false });

const executionSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  status: { type: String, enum: ['success', 'skipped', 'failed'], default: 'success' },
  message: { type: String },
  ranAt: { type: Date, default: Date.now }
}, { _id: false });

const automationSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },

  name: { type: String, trim: true, default: 'Untitled automation' },
  description: { type: String, trim: true, default: '' },

  triggers: {
    type: [triggerSchema],
    default: undefined
  },
  conditions: {
    type: [conditionSchema],
    default: []
  },
  actions: {
    type: [actionSchema],
    default: undefined
  },

  // Legacy single-step fields kept for existing saved rules and seeded blueprints.
  triggerType: { 
    type: String, 
    enum: ['status_change', 'priority_change', 'task_overdue', 'task_created', 'due_date_set', 'due_date_changed', 'custom_field_change']
  },
  triggerValue: { type: String },

  actionType: { 
    type: String, 
    enum: ['archive_task', 'assign_user', 'set_due_date', 'change_status', 'change_priority', 'send_notification', 'add_comment', 'create_subtask', 'set_custom_field']
  },
  actionValue: { type: mongoose.Schema.Types.Mixed },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastRunAt: { type: Date },
  lastRunStatus: { type: String, enum: ['success', 'skipped', 'failed'] },
  lastRunMessage: { type: String },
  executionLog: {
    type: [executionSchema],
    default: []
  }
}, { timestamps: true });

automationSchema.pre('validate', function normalizeAutomation() {
  if ((!this.triggers || this.triggers.length === 0) && this.triggerType) {
    this.triggers = [{
      type: this.triggerType,
      value: this.triggerValue || 'any'
    }];
  }

  if ((!this.actions || this.actions.length === 0) && this.actionType) {
    this.actions = [{
      type: this.actionType,
      value: this.actionValue
    }];
  }

  if (!this.triggerType && this.triggers?.[0]) {
    this.triggerType = this.triggers[0].type;
    this.triggerValue = this.triggers[0].value || 'any';
  }

  if (!this.actionType && this.actions?.[0]) {
    this.actionType = this.actions[0].type;
    this.actionValue = this.actions[0].value;
  }

  if (!this.name || this.name.trim().length === 0 || this.name === 'Untitled automation') {
    const trigger = this.triggers?.[0]?.type || this.triggerType || 'trigger';
    const action = this.actions?.[0]?.type || this.actionType || 'action';
    this.name = `${trigger.replace(/_/g, ' ')} -> ${action.replace(/_/g, ' ')}`;
  }

});

automationSchema.index({ project: 1, isActive: 1 });
automationSchema.index({ project: 1, 'triggers.type': 1 });

module.exports = mongoose.models.Automation || mongoose.model('Automation', automationSchema);
