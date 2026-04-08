const Task = require('../../models/Task');
const Project = require('../../models/Project');
const User = require('../../models/User');
const Invite = require('../../models/Invite');
const Membership = require('../../models/Membership');
const { createDomainError } = require('../shared/errors');
const { ensureMembership } = require('../shared/access');
const { emitDomainEvent } = require('../shared/domainEvents');

const TASK_UPDATE_FIELDS = ['title', 'description', 'status', 'priority', 'startDate', 'dueDate', 'assignee', 'index'];

const requireTaskAccess = async (userId, task) => {
  if (!task) {
    throw createDomainError(404, 'Task not found');
  }

  return ensureMembership(userId, task.organization);
};

const createTask = async ({ body, user, io }) => {
  const { title, description, status, priority, startDate, dueDate, projectId, orgId, assignee, assigneeEmail } = body;

  await ensureMembership(user._id, orgId);

  let resolvedAssignee = assignee || null;
  let storedAssigneeEmail = null;
  let externalInviteUrl = null;

  if (assigneeEmail && !assignee) {
    const normalizedEmail = assigneeEmail.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      const isMember = await Membership.findOne({
        user: existingUser._id,
        organization: orgId,
      });

      resolvedAssignee = existingUser._id;

      if (!isMember) {
        const existingInvite = await Invite.findOne({
          email: normalizedEmail,
          organization: orgId,
          status: 'pending',
        });

        if (!existingInvite) {
          await Invite.create({
            email: normalizedEmail,
            organization: orgId,
            invitedBy: user._id,
            role: 'member',
          });
        }
      }
    } else {
      storedAssigneeEmail = normalizedEmail;

      let invite = await Invite.findOne({
        email: storedAssigneeEmail,
        organization: orgId,
        status: 'pending',
      });

      if (!invite) {
        invite = await Invite.create({
          email: storedAssigneeEmail,
          organization: orgId,
          invitedBy: user._id,
          role: 'member',
        });
      }

      externalInviteUrl = `${process.env.CLIENT_URL}/login?invite=${invite.token}`;
    }
  }

  const task = await Task.create({
    title,
    description,
    status: status || 'todo',
    priority: priority || 'medium',
    startDate,
    dueDate,
    project: projectId,
    organization: orgId,
    assignee: resolvedAssignee,
    assigneeEmail: storedAssigneeEmail,
    reporter: user._id,
  });

  const populatedTask = await Task.findById(task._id)
    .populate('assignee', 'name email avatar')
    .populate('project', 'name');

  await emitDomainEvent('task.created', {
    io,
    user,
    task: populatedTask,
    populatedTask,
    projectId,
    resolvedAssignee,
    storedAssigneeEmail,
    externalInviteUrl,
  });
  return populatedTask;
};

const getProjectTasks = async ({ projectId, userId, query }) => {
  const project = await Project.findById(projectId).select('organization');
  if (!project) {
    throw createDomainError(404, 'Project not found');
  }

  await ensureMembership(userId, project.organization);

  const showArchived = query.archived === 'true';
  const filters = {
    project: projectId,
    archived: showArchived ? true : { $ne: true },
  };

  const page = parseInt(query.page, 10) || 0;
  const limit = parseInt(query.limit, 10) || 50;

  if (query.page !== undefined) {
    const total = await Task.countDocuments(filters);
    const tasks = await Task.find(filters)
      .populate('assignee', 'name avatar')
      .populate('dependencies', 'title status')
      .sort({ index: 1 })
      .skip(page * limit)
      .limit(limit);

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: (page + 1) * limit < total,
      },
    };
  }

  return Task.find(filters)
    .populate('assignee', 'name avatar')
    .populate('dependencies', 'title status')
    .sort({ index: 1 });
};

const getTask = async ({ taskId, userId }) => {
  const task = await Task.findById(taskId)
    .populate('assignee', 'name avatar')
    .populate('dependencies', 'title status');

  await requireTaskAccess(userId, task);
  return task;
};

const deleteTask = async ({ taskId, user, io }) => {
  const task = await Task.findById(taskId);
  await requireTaskAccess(user._id, task);

  await Task.deleteOne({ _id: taskId });
  await emitDomainEvent('task.deleted', { io, user, task });

  return { id: taskId, message: 'Task removed' };
};

const updateTask = async ({ taskId, body, user, io }) => {
  const oldTask = await Task.findById(taskId).populate('dependencies');
  await requireTaskAccess(user._id, oldTask);

  if (body.status === 'done' && oldTask.dependencies.length > 0) {
    const incompleteDependencies = oldTask.dependencies.filter((dependency) => dependency.status !== 'done');

    if (incompleteDependencies.length > 0) {
      const titles = incompleteDependencies.map((dependency) => dependency.title).join(', ');
      throw createDomainError(400, `Cannot complete task. It is waiting on: ${titles}`);
    }
  }

  const updateData = {};
  for (const field of TASK_UPDATE_FIELDS) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, { new: true })
    .populate('dependencies', 'title status')
    .populate('assignee', 'name avatar')
    .populate('project', 'name');

  await emitDomainEvent('task.updated', { io, user, oldTask, updatedTask, body });
  return updatedTask;
};

module.exports = {
  createTask,
  getProjectTasks,
  getTask,
  deleteTask,
  updateTask,
  requireTaskAccess,
};
