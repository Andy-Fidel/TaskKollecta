const Automation = require('../models/Automation');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const { sendNotification } = require('./notificationService');
const { logActivity } = require('./activityLogger');

const normalizeRuleTriggers = (rule) => {
  if (Array.isArray(rule.triggers) && rule.triggers.length > 0) return rule.triggers;
  if (rule.triggerType) return [{ type: rule.triggerType, value: rule.triggerValue || 'any' }];
  return [];
};

const normalizeRuleActions = (rule) => {
  if (Array.isArray(rule.actions) && rule.actions.length > 0) return rule.actions;
  if (rule.actionType) return [{ type: rule.actionType, value: rule.actionValue }];
  return [];
};

const triggerMatches = (trigger, triggerType, triggerValue, opts = {}) => {
  if (trigger.type !== triggerType) return false;
  if (trigger.type === 'custom_field_change' && trigger.fieldKey && trigger.fieldKey !== opts.fieldKey) return false;
  return trigger.value === 'any' || trigger.value === triggerValue;
};

const getTaskFieldValue = (task, condition) => {
  if (condition.field === 'customField') {
    return task.customFieldValues?.find((field) => field.key === condition.fieldKey)?.value;
  }
  return task[condition.field];
};

const normalizeValue = (value) => {
  if (value === undefined || value === null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value.toString) return value.toString();
  return value;
};

const conditionMatches = (task, condition) => {
  const actual = getTaskFieldValue(task, condition);
  const expected = condition.value;

  if (condition.operator === 'exists') return actual !== undefined && actual !== null && actual !== '';
  if (condition.operator === 'not_exists') return actual === undefined || actual === null || actual === '';
  if (condition.operator === 'not_equals') return normalizeValue(actual) !== normalizeValue(expected);
  return normalizeValue(actual) === normalizeValue(expected);
};

const renderTemplate = (template, task, context = {}) => {
  if (typeof template !== 'string') return template;

  const values = {
    task_name: task.title || '',
    task_title: task.title || '',
    task_id: task._id?.toString() || '',
    task_status: task.status || '',
    task_priority: task.priority || '',
    due_date: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
    trigger_type: context.triggerType || '',
    trigger_value: context.triggerValue || ''
  };

  return template.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, key) => values[key] ?? '');
};

const resolveRelativeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'object' && value.mode === 'relative') {
    const amount = Number(value.amount || 0);
    const unit = value.unit || 'days';
    const date = new Date();
    if (unit === 'minutes') date.setMinutes(date.getMinutes() + amount);
    else if (unit === 'hours') date.setHours(date.getHours() + amount);
    else if (unit === 'weeks') date.setDate(date.getDate() + amount * 7);
    else date.setDate(date.getDate() + amount);
    return date;
  }

  return new Date(value);
};

const pushExecutionLog = async (rule, entry) => {
  rule.lastRunAt = new Date();
  rule.lastRunStatus = entry.status;
  rule.lastRunMessage = entry.message;
  rule.executionLog = [
    { ...entry, ranAt: new Date() },
    ...(rule.executionLog || [])
  ].slice(0, 20);
  await rule.save();
};

/**
 * Run matching automation rules for a given trigger.
 * Called from taskController on status/priority changes, and from the cron scheduler for overdue tasks.
 *
 * @param {ObjectId} projectId
 * @param {string} triggerType  - 'status_change' | 'priority_change' | 'task_overdue'
 * @param {string} triggerValue - the new status/priority value, or 'any' for overdue
 * @param {Object} originalTask - the task document (must have _id, assignee, project)
 * @param {Object} [opts]       - optional: { io } for real-time push
 */
const runAutomations = async (projectId, triggerType, triggerValue, originalTask, opts = {}) => {
  try {
    const candidateRules = await Automation.find({
      project: projectId,
      isActive: true
    });
    const rules = candidateRules.filter((rule) =>
      normalizeRuleTriggers(rule).some((trigger) => triggerMatches(trigger, triggerType, triggerValue, opts))
    );

    if (rules.length === 0) return;

    // Re-fetch task to ensure clean Mongoose document
    const taskToUpdate = await Task.findById(originalTask._id).populate('assignee', 'name email');
    if (!taskToUpdate) return;

    for (const rule of rules) {
      let hasChanges = false;
      const actions = normalizeRuleActions(rule);

      try {
        if (Array.isArray(rule.conditions) && rule.conditions.length > 0) {
          const passed = rule.conditions.every((condition) => conditionMatches(taskToUpdate, condition));
          if (!passed) {
            await pushExecutionLog(rule, {
              task: taskToUpdate._id,
              status: 'skipped',
              message: 'Conditions did not match'
            });
            continue;
          }
        }

        console.log(`⚡ Automation: ${rule.name || rule._id} (${triggerType}=${triggerValue})`);

        for (const action of actions) {
          const actionType = action.type || action.actionType;
          const actionValue = action.value ?? action.actionValue;

          if (actionType === 'archive_task') {
            taskToUpdate.archived = true;
            hasChanges = true;
          }

          if (actionType === 'assign_user') {
            if (actionValue === 'project_lead') {
              const project = await Project.findById(projectId);
              if (project && project.lead) {
                taskToUpdate.assignee = project.lead;
                hasChanges = true;
              }
            } else if (actionValue === 'reporter' && taskToUpdate.reporter) {
              taskToUpdate.assignee = taskToUpdate.reporter;
              hasChanges = true;
            } else if (actionValue) {
              taskToUpdate.assignee = actionValue;
              hasChanges = true;
            }
          }

          if (actionType === 'set_due_date') {
            const nextDate = resolveRelativeDate(actionValue);
            if (nextDate && !Number.isNaN(nextDate.getTime())) {
              taskToUpdate.dueDate = nextDate;
              hasChanges = true;
            }
          }

          if (actionType === 'change_status') {
            const project = await Project.findById(projectId).select('workflowStatuses');
            const validStatuses = project?.workflowStatuses?.map((status) => status.id) || ['todo', 'in-progress', 'review', 'done'];
            if (actionValue && validStatuses.includes(actionValue)) {
              taskToUpdate.status = actionValue;
              hasChanges = true;
            }
          }

          if (actionType === 'change_priority') {
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            if (actionValue && validPriorities.includes(actionValue)) {
              taskToUpdate.priority = actionValue;
              hasChanges = true;
            }
          }

          if (actionType === 'set_custom_field') {
            const fieldKey = action.fieldKey;
            if (fieldKey) {
              const existing = taskToUpdate.customFieldValues?.find((field) => field.key === fieldKey);
              if (existing) {
                existing.value = actionValue;
              } else {
                taskToUpdate.customFieldValues.push({ key: fieldKey, value: actionValue });
              }
              hasChanges = true;
            }
          }

          if (actionType === 'create_subtask') {
            const title = renderTemplate(actionValue?.title || actionValue || 'Follow up on {{task_name}}', taskToUpdate, { triggerType, triggerValue });
            taskToUpdate.subtasks.push({ title, isCompleted: false });
            hasChanges = true;
          }

          if (actionType === 'add_comment') {
            const message = renderTemplate(actionValue?.message || actionValue || 'Automation ran on {{task_name}}', taskToUpdate, { triggerType, triggerValue });
            const author = opts.actorId || taskToUpdate.reporter || taskToUpdate.assignee;
            if (author) {
              await Comment.create({
                task: taskToUpdate._id,
                user: author,
                content: message
              });
            }
          }

          if (actionType === 'send_notification') {
            let recipientId = null;

            if (actionValue === 'assignee' && taskToUpdate.assignee) {
              recipientId = taskToUpdate.assignee._id || taskToUpdate.assignee;
            } else if (actionValue === 'project_lead') {
              const project = await Project.findById(projectId);
              if (project && project.lead) {
                recipientId = project.lead;
              }
            } else if (actionValue === 'reporter' && taskToUpdate.reporter) {
              recipientId = taskToUpdate.reporter;
            } else if (actionValue) {
              recipientId = actionValue;
            }

            if (recipientId) {
              const actionMsg = action.value?.message
                ? renderTemplate(action.value.message, taskToUpdate, { triggerType, triggerValue })
                : buildNotificationMessage(triggerType, triggerValue, taskToUpdate.title);

              await sendNotification(opts.io, {
                recipientId,
                senderId: opts.actorId || recipientId,
                type: 'automation',
                relatedId: taskToUpdate._id,
                relatedModel: 'Task',
                relatedProject: projectId,
                message: actionMsg,
                allowSelf: true,
              });
            }
          }
        }

        if (hasChanges) {
          await taskToUpdate.save();
          await logActivity({ io: opts.io, user: { _id: opts.actorId || taskToUpdate.reporter } }, {
            task: taskToUpdate,
            action: 'updated',
            details: `automation "${rule.name}" updated the task`
          });
        }

        await pushExecutionLog(rule, {
          task: taskToUpdate._id,
          status: 'success',
          message: `${actions.length} action${actions.length === 1 ? '' : 's'} processed`
        });
      } catch (ruleError) {
        console.error("❌ Automation rule failed:", ruleError);
        await pushExecutionLog(rule, {
          task: taskToUpdate._id,
          status: 'failed',
          message: ruleError.message
        });
      }
    }

  } catch (error) {
    console.error("❌ Automation Failed:", error);
  }
};

// Helper to build a readable notification message
function buildNotificationMessage(triggerType, triggerValue, taskTitle) {
  const title = taskTitle || 'a task';
  switch (triggerType) {
    case 'status_change':
      return `⚡ Automation: "${title}" status changed to ${triggerValue}`;
    case 'priority_change':
      return `⚡ Automation: "${title}" priority changed to ${triggerValue}`;
    case 'task_overdue':
      return `⏰ Overdue alert: "${title}" is past its due date`;
    default:
      return `⚡ Automation triggered on "${title}"`;
  }
}

module.exports = runAutomations;
