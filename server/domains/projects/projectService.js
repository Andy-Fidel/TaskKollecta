const mongoose = require('mongoose');
const Project = require('../../models/Project');
const Task = require('../../models/Task');
const ProjectUpdate = require('../../models/ProjectUpdate');
const Membership = require('../../models/Membership');
const { invalidateProjectCache } = require('../../utils/cacheUtils');
const { createDomainError } = require('../shared/errors');
const { ensureMembership } = require('../shared/access');

const DEFAULT_WORKFLOW_STATUSES = [
  { id: 'todo', label: 'To Do', color: '#64748b', order: 0, isDone: false },
  { id: 'in-progress', label: 'In Progress', color: '#3b82f6', order: 1, isDone: false },
  { id: 'review', label: 'Review', color: '#f59e0b', order: 2, isDone: false },
  { id: 'done', label: 'Done', color: '#22c55e', order: 3, isDone: true },
];

const normalizeKey = (value, separator = '-') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^\\${separator}|\\${separator}$`, 'g'), '');

const normalizeWorkflowStatuses = (statuses) =>
  (Array.isArray(statuses) && statuses.length ? statuses : DEFAULT_WORKFLOW_STATUSES)
    .filter((status) => status?.id || status?.label)
    .map((status, index) => ({
      id: normalizeKey(status.id || status.label),
      label: String(status.label || status.id).trim(),
      color: status.color || '#64748b',
      order: Number.isFinite(Number(status.order)) ? Number(status.order) : index,
      isDone: Boolean(status.isDone),
    }))
    .filter((status) => status.id && status.label);

const normalizeCustomFields = (fields) =>
  (Array.isArray(fields) ? fields : [])
    .filter((field) => field?.key || field?.name)
    .map((field, index) => ({
      key: normalizeKey(field.key || field.name, '_'),
      name: String(field.name || field.key).trim(),
      type: field.type || 'text',
      options: Array.isArray(field.options) ? field.options.filter(Boolean).map(String) : [],
      required: Boolean(field.required),
      order: Number.isFinite(Number(field.order)) ? Number(field.order) : index,
    }))
    .filter((field) => field.key && field.name);

const PROJECT_UPDATE_FIELDS = ['name', 'description', 'color', 'dueDate', 'lead', 'status', 'defaultView', 'privacy', 'isTemplate', 'workflowStatuses', 'customFields'];

const ensureProjectAccess = async (userId, projectId, message = 'Project not found') => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw createDomainError(404, message);
  }

  const membership = await ensureMembership(userId, project.organization);
  return { project, membership };
};

const createProject = async ({ body, userId }) => {
  const { name, description, orgId, lead, dueDate, color, defaultView, privacy } = body;

  const project = await Project.create({
    name,
    description,
    organization: orgId,
    lead: lead || userId,
    dueDate,
    color,
    defaultView,
    privacy,
    workflowStatuses: normalizeWorkflowStatuses(body.workflowStatuses),
    customFields: normalizeCustomFields(body.customFields),
  });

  const populatedProject = await Project.findById(project._id).populate('lead', 'name avatar');
  await invalidateProjectCache(orgId);

  return populatedProject;
};

const getOrgProjects = async ({ orgId, userId }) => {
  await ensureMembership(userId, orgId, 'Not authorized to view projects of this organization');

  return Project.find({ organization: orgId }).populate('lead', 'name email');
};

const getProjectDetails = async ({ projectId, userId }) => {
  const { project } = await ensureProjectAccess(userId, projectId);
  return project;
};

const getProjectAnalytics = async ({ projectId, userId }) => {
  const objectId = new mongoose.Types.ObjectId(projectId);
  const { project } = await ensureProjectAccess(userId, objectId);

  const projectTaskMatch = { $or: [{ project: objectId }, { 'projectMemberships.project': objectId }] };

  const statusStats = await Task.aggregate([
    { $match: projectTaskMatch },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const priorityStats = await Task.aggregate([
    { $match: projectTaskMatch },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  const doneStatuses = project.workflowStatuses?.filter((status) => status.isDone).map((status) => status.id) || ['done'];
  const totalTasks = await Task.countDocuments(projectTaskMatch);
  const completedTasks = await Task.countDocuments({ ...projectTaskMatch, status: { $in: doneStatuses.length ? doneStatuses : ['done'] } });

  return {
    project,
    analytics: {
      statusDistribution: statusStats,
      priorityDistribution: priorityStats,
      totalTasks,
      completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    },
  };
};

const createUpdate = async ({ projectId, userId, body }) => {
  await ensureProjectAccess(userId, projectId);

  const update = await ProjectUpdate.create({
    project: projectId,
    author: userId,
    status: body.status,
    message: body.message,
  });

  return ProjectUpdate.findById(update._id).populate('author', 'name avatar');
};

const getUpdates = async ({ projectId, userId }) => {
  await ensureProjectAccess(userId, projectId);

  return ProjectUpdate.find({ project: projectId })
    .populate('author', 'name avatar')
    .sort({ createdAt: -1 });
};

const updateProject = async ({ projectId, userId, body }) => {
  const { project, membership } = await ensureProjectAccess(userId, projectId);

  if (!['owner', 'admin'].includes(membership.role)) {
    throw createDomainError(403, 'Not authorized to update project');
  }

  const updateData = {};
  for (const field of PROJECT_UPDATE_FIELDS) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (updateData.workflowStatuses !== undefined) {
    updateData.workflowStatuses = normalizeWorkflowStatuses(updateData.workflowStatuses);
  }

  if (updateData.customFields !== undefined) {
    updateData.customFields = normalizeCustomFields(updateData.customFields);
  }

  const updatedProject = await Project.findByIdAndUpdate(projectId, updateData, { new: true });
  await invalidateProjectCache(project.organization);

  return updatedProject;
};

const deleteProject = async ({ projectId, userId }) => {
  const { project, membership } = await ensureProjectAccess(userId, projectId);

  if (!['owner', 'admin'].includes(membership.role)) {
    throw createDomainError(403, 'Not authorized to delete project');
  }

  await Task.deleteMany({ project: projectId });
  await Project.findByIdAndDelete(projectId);
  await invalidateProjectCache(project.organization);

  return { message: 'Project and tasks deleted' };
};

const getAllProjects = async ({ userId, activeOrgId }) => {
  const memberships = await Membership.find({ user: userId });
  let validOrgIds = memberships.map((membership) => membership.organization.toString());

  if (activeOrgId && validOrgIds.includes(activeOrgId)) {
    validOrgIds = [activeOrgId];
  }

  const targetOrgObjectIds = validOrgIds.map((id) => new mongoose.Types.ObjectId(id));

  return Project.aggregate([
    { $match: { organization: { $in: targetOrgObjectIds } } },
    {
      $lookup: {
        from: 'tasks',
        let: { projectId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$project', '$$projectId'] },
                  { $in: ['$$projectId', { $ifNull: ['$projectMemberships.project', []] }] },
                ],
              },
            },
          },
        ],
        as: 'projectTasks',
      },
    },
    {
      $addFields: {
        totalTasks: { $size: '$projectTasks' },
        completedTasks: {
          $size: {
            $filter: {
              input: '$projectTasks',
              as: 't',
              cond: { $eq: ['$$t.status', 'done'] },
            },
          },
        },
        assigneeIds: {
          $filter: {
            input: { $setUnion: '$projectTasks.assignee' },
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assigneeIds',
        foreignField: '_id',
        as: 'team',
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        updatedAt: 1,
        dueDate: 1,
        color: 1,
        status: 1,
        lead: 1,
        organization: 1,
        privacy: 1,
        tags: 1,
        isTemplate: 1,
        totalTasks: 1,
        completedTasks: 1,
        team: { name: 1, avatar: 1, _id: 1 },
        progress: {
          $cond: [
            { $eq: ['$totalTasks', 0] },
            0,
            { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
          ],
        },
      },
    },
    { $sort: { updatedAt: -1 } },
  ]);
};

const duplicateProject = async ({ projectId, userId, body }) => {
  const { project: sourceProject } = await ensureProjectAccess(userId, projectId, 'Source project not found');

  const newProject = await Project.create({
    name: body.name || `${sourceProject.name} (Copy)`,
    description: sourceProject.description,
    organization: sourceProject.organization,
    lead: userId,
    color: sourceProject.color,
    defaultView: sourceProject.defaultView,
    privacy: sourceProject.privacy,
    tags: sourceProject.tags,
    isTemplate: body.isTemplate || false,
    workflowStatuses: sourceProject.workflowStatuses,
    customFields: sourceProject.customFields,
  });

  const sourceTasks = await Task.find({ project: sourceProject._id });

  if (sourceTasks.length > 0) {
    const newTasksData = sourceTasks.map((task) => ({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      organization: task.organization,
      project: newProject._id,
      projectMemberships: [{ project: newProject._id }],
      reporter: userId,
      assignee: task.assignee,
      tags: task.tags,
      customFieldValues: task.customFieldValues,
    }));

    await Task.insertMany(newTasksData);
  }

  await invalidateProjectCache(sourceProject.organization);

  return newProject;
};

module.exports = {
  createProject,
  getOrgProjects,
  getProjectDetails,
  getProjectAnalytics,
  createUpdate,
  getUpdates,
  updateProject,
  deleteProject,
  getAllProjects,
  duplicateProject,
};
