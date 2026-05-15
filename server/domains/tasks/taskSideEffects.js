const {
  sendNotification,
  sendTaskAssignmentEmail,
  sendExternalTaskAssignmentEmail,
  sendStatusChangeEmail,
} = require('../../utils/notificationService');
const { logActivity } = require('../../utils/activityLogger');
const runAutomations = require('../../utils/automationEngine');
const { invalidateTaskCache } = require('../../utils/cacheUtils');

const recordTaskCreated = async ({ io, user, task }) =>
  logActivity({ io, user }, {
    task,
    action: 'created',
    details: `created the task "${task.title}"`,
  });

const recordTaskDeleted = async ({ io, user, task }) =>
  logActivity({ io, user }, {
    task,
    action: 'deleted',
    details: 'Task removed permanently',
  });

const recordTaskMoved = async ({ io, user, task, status }) =>
  logActivity({ io, user }, {
    task,
    action: 'moved',
    details: `moved "${task.title}" to ${status}`,
  });

const notifyTaskCreationAssignment = async ({
  io,
  user,
  task,
  projectId,
  resolvedAssignee,
  storedAssigneeEmail,
  externalInviteUrl,
}) => {
  if (resolvedAssignee && resolvedAssignee.toString() !== user._id.toString()) {
    await sendNotification(io, {
      recipientId: resolvedAssignee,
      senderId: user._id,
      type: 'task_assigned',
      relatedId: task._id,
      relatedModel: 'Task',
      relatedProject: projectId,
      message: `assigned you to task: ${task.title}`,
    });

    await sendTaskAssignmentEmail(resolvedAssignee, {
      assignerName: user.name,
      task,
      projectName: task.project?.name,
      projectId,
    });
    return;
  }

  if (storedAssigneeEmail && externalInviteUrl) {
    await sendExternalTaskAssignmentEmail(storedAssigneeEmail, {
      assignerName: user.name,
      task,
      projectName: task.project?.name,
      inviteUrl: externalInviteUrl,
    });
  }
};

const runTaskUpdateAutomations = async ({ io, user, task, body }) => {
  const runs = [];

  if (body.status) {
    runs.push(runAutomations(task.project, 'status_change', body.status, task, { io, actorId: user?._id }));
  }

  if (body.priority) {
    runs.push(runAutomations(task.project, 'priority_change', body.priority, task, { io, actorId: user?._id }));
  }

  await Promise.all(runs);
};

const notifyTaskUpdate = async ({ io, user, oldTask, updatedTask, body }) => {
  if (body.assignee && body.assignee !== oldTask.assignee?.toString() && body.assignee !== user._id.toString()) {
    await sendNotification(io, {
      recipientId: body.assignee,
      senderId: user._id,
      type: 'task_assigned',
      relatedId: updatedTask._id,
      relatedModel: 'Task',
      relatedProject: updatedTask.project?._id || updatedTask.project,
      message: `assigned you to task: ${updatedTask.title}`,
    });

    await sendTaskAssignmentEmail(body.assignee, {
      assignerName: user.name,
      task: updatedTask,
      projectName: updatedTask.project?.name || 'General',
      projectId: updatedTask.project,
    });
  }

  if (body.status && oldTask.status !== body.status && updatedTask.assignee) {
    const assigneeId = updatedTask.assignee._id || updatedTask.assignee;
    if (assigneeId.toString() !== user._id.toString()) {
      await sendNotification(io, {
        recipientId: assigneeId,
        senderId: user._id,
        type: 'task_status_change',
        relatedId: updatedTask._id,
        relatedModel: 'Task',
        relatedProject: updatedTask.project?._id || updatedTask.project,
        message: `moved your task "${updatedTask.title}" from ${oldTask.status} to ${body.status}`,
      });

      await sendStatusChangeEmail(assigneeId, {
        changerName: user.name,
        task: updatedTask,
        projectId: updatedTask.project,
        oldStatus: oldTask.status,
        newStatus: body.status,
      });
    }
  }
};

const invalidateProjectTasks = (projectId) => invalidateTaskCache(projectId);

module.exports = {
  invalidateProjectTasks,
  notifyTaskCreationAssignment,
  notifyTaskUpdate,
  recordTaskCreated,
  recordTaskDeleted,
  recordTaskMoved,
  runTaskUpdateAutomations,
};
