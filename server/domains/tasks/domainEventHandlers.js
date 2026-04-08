const {
  invalidateProjectTasks,
  notifyTaskCreationAssignment,
  notifyTaskUpdate,
  recordTaskCreated,
  recordTaskDeleted,
  recordTaskMoved,
  runTaskUpdateAutomations,
} = require('./taskSideEffects');

module.exports = (registerDomainEventHandler) => {
  registerDomainEventHandler('task.created', async ({
    io,
    user,
    task,
    populatedTask,
    projectId,
    resolvedAssignee,
    storedAssigneeEmail,
    externalInviteUrl,
  }) => {
    await recordTaskCreated({ io, user, task });
    await notifyTaskCreationAssignment({
      io,
      user,
      task: populatedTask,
      projectId,
      resolvedAssignee,
      storedAssigneeEmail,
      externalInviteUrl,
    });
    await invalidateProjectTasks(projectId);
  });

  registerDomainEventHandler('task.deleted', async ({ io, user, task }) => {
    await recordTaskDeleted({ io, user, task });
    await invalidateProjectTasks(task.project);
  });

  registerDomainEventHandler('task.updated', async ({ io, user, oldTask, updatedTask, body }) => {
    if (body.status && oldTask.status !== body.status) {
      await recordTaskMoved({ io, user, task: updatedTask, status: body.status });
    }

    await runTaskUpdateAutomations({ task: updatedTask, body });
    await notifyTaskUpdate({ io, user, oldTask, updatedTask, body });
    await invalidateProjectTasks(updatedTask.project);
  });
};
