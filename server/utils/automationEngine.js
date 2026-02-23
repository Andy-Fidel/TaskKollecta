const Automation = require('../models/Automation');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');

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
    // Find matching rules (exact value match, or 'any' wildcard)
    const rules = await Automation.find({
      project: projectId,
      triggerType,
      $or: [
        { triggerValue },
        { triggerValue: 'any' }
      ],
      isActive: true
    });

    if (rules.length === 0) return;

    // Re-fetch task to ensure clean Mongoose document
    const taskToUpdate = await Task.findById(originalTask._id).populate('assignee', 'name email');
    if (!taskToUpdate) return;

    let hasChanges = false;

    for (const rule of rules) {
      console.log(`⚡ Automation: ${rule.triggerType}=${triggerValue} → ${rule.actionType}(${rule.actionValue || ''})`);

      // --- EXISTING ACTIONS ---

      if (rule.actionType === 'archive_task') {
        taskToUpdate.archived = true;
        hasChanges = true;
      }

      if (rule.actionType === 'assign_user') {
        if (rule.actionValue === 'project_lead') {
          const project = await Project.findById(projectId);
          if (project && project.lead) {
            taskToUpdate.assignee = project.lead;
            hasChanges = true;
          }
        } else if (rule.actionValue) {
          taskToUpdate.assignee = rule.actionValue;
          hasChanges = true;
        }
      }

      if (rule.actionType === 'set_due_date') {
        if (rule.actionValue) {
          taskToUpdate.dueDate = new Date(rule.actionValue);
          hasChanges = true;
        }
      }

      // --- NEW ACTIONS ---

      if (rule.actionType === 'change_status') {
        const validStatuses = ['todo', 'in-progress', 'review', 'done'];
        if (rule.actionValue && validStatuses.includes(rule.actionValue)) {
          taskToUpdate.status = rule.actionValue;
          hasChanges = true;
        }
      }

      if (rule.actionType === 'change_priority') {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (rule.actionValue && validPriorities.includes(rule.actionValue)) {
          taskToUpdate.priority = rule.actionValue;
          hasChanges = true;
        }
      }

      if (rule.actionType === 'send_notification') {
        // Determine recipient: 'assignee' sends to task assignee, 'project_lead' sends to lead
        let recipientId = null;

        if (rule.actionValue === 'assignee' && taskToUpdate.assignee) {
          recipientId = taskToUpdate.assignee._id || taskToUpdate.assignee;
        } else if (rule.actionValue === 'project_lead') {
          const project = await Project.findById(projectId);
          if (project && project.lead) {
            recipientId = project.lead;
          }
        } else if (rule.actionValue) {
          // Direct user ID
          recipientId = rule.actionValue;
        }

        if (recipientId) {
          // Build a human-readable message
          const actionMsg = buildNotificationMessage(triggerType, triggerValue, taskToUpdate.title);

          await Notification.create({
            recipient: recipientId,
            sender: recipientId, // system-generated, using same user as placeholder
            type: 'automation',
            relatedId: taskToUpdate._id,
            relatedModel: 'Task',
            message: actionMsg
          });

          // Push via socket if available
          if (opts.io) {
            opts.io.to(`user:${recipientId}`).emit('new_notification', { message: actionMsg });
          }
        }
      }
    }

    if (hasChanges) {
      await taskToUpdate.save();
      console.log(`✅ Automation applied to task ${taskToUpdate._id}`);
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