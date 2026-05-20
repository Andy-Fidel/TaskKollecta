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
      wipLimit: Number.isFinite(Number(status.wipLimit)) && Number(status.wipLimit) > 0 ? Number(status.wipLimit) : null,
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

const PROJECT_UPDATE_FIELDS = ['name', 'description', 'color', 'startDate', 'dueDate', 'lead', 'status', 'defaultView', 'privacy', 'isTemplate', 'members', 'workflowStatuses', 'customFields'];

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const shiftDate = (value, offsetMs) => {
  const date = toDate(value);
  if (!date || !Number.isFinite(offsetMs)) return value || null;
  return new Date(date.getTime() + offsetMs);
};

const ensureProjectAccess = async (userId, projectId, message = 'Project not found') => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw createDomainError(404, message);
  }

  const membership = await ensureMembership(userId, project.organization);
  const projectMember = project.members?.find((member) => member.user?.toString() === userId.toString());
  const canAccessPrivateProject = project.privacy !== 'private'
    || ['owner', 'admin'].includes(membership.role)
    || Boolean(projectMember)
    || project.lead?.toString() === userId.toString();

  if (!canAccessPrivateProject) {
    throw createDomainError(404, message);
  }

  return { project, membership };
};

const createProject = async ({ body, userId }) => {
  const { name, description, orgId, lead, startDate, dueDate, color, defaultView, privacy } = body;
  await ensureMembership(userId, orgId);

  const memberIds = new Set(
    (Array.isArray(body.members) ? body.members : [])
      .map((memberId) => memberId?.toString())
      .filter(Boolean),
  );
  memberIds.add(userId.toString());
  if (lead) memberIds.add(lead.toString());

  const seedTasks = Array.isArray(body.seedTasks)
    ? body.seedTasks
      .map((task) => ({
        title: task.title?.trim(),
        description: task.description || '',
        priority: ['low', 'medium', 'high', 'urgent'].includes(task.priority) ? task.priority : 'medium',
      }))
      .filter((task) => task.title)
      .slice(0, 100)
    : [];

  let project = null;
  let createdTaskIds = [];

  try {
    project = await Project.create({
      name,
      description,
      organization: orgId,
      lead: lead || userId,
      startDate,
      dueDate,
      color,
      defaultView,
      privacy,
      members: [...memberIds].map((memberId) => ({
        user: memberId,
        role: memberId === userId.toString() ? 'owner' : 'editor',
      })),
      workflowStatuses: normalizeWorkflowStatuses(body.workflowStatuses),
      customFields: normalizeCustomFields(body.customFields),
    });

    if (seedTasks.length > 0) {
      const tasks = await Task.insertMany(seedTasks.map((task, index) => ({
        ...task,
        status: 'todo',
        index,
        organization: orgId,
        project: project._id,
        projectMemberships: [{ project: project._id }],
        reporter: userId,
      })));
      createdTaskIds = tasks.map((task) => task._id);
    }

    const populatedProject = await Project.findById(project._id)
      .populate('lead', 'name avatar')
      .populate('members.user', 'name email avatar');
    await invalidateProjectCache(orgId);

    return populatedProject;
  } catch (error) {
    if (createdTaskIds.length > 0) await Task.deleteMany({ _id: { $in: createdTaskIds } });
    if (project?._id) await Project.findByIdAndDelete(project._id);
    throw error;
  }
};

const getOrgProjects = async ({ orgId, userId }) => {
  const membership = await ensureMembership(userId, orgId, 'Not authorized to view projects of this organization');

  const query = { organization: orgId };
  if (!['owner', 'admin'].includes(membership.role)) {
    query.$or = [
      { privacy: { $ne: 'private' } },
      { 'members.user': userId },
      { lead: userId },
    ];
  }

  return Project.find(query).populate('lead', 'name email').populate('members.user', 'name email avatar');
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

  if (updateData.members !== undefined) {
    const memberIds = new Set(
      (Array.isArray(updateData.members) ? updateData.members : [])
        .map((member) => (member.user || member)?.toString())
        .filter(Boolean),
    );
    memberIds.add(userId.toString());
    if (updateData.lead || project.lead) memberIds.add((updateData.lead || project.lead).toString());
    updateData.members = [...memberIds].map((memberId) => ({
      user: memberId,
      role: memberId === userId.toString() ? 'owner' : 'editor',
    }));
  }

  const updatedProject = await Project.findByIdAndUpdate(projectId, updateData, { new: true })
    .populate('lead', 'name avatar email')
    .populate('members.user', 'name avatar email');
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

const getAllProjects = async ({ userId, activeOrgId, query = {} }) => {
  const memberships = await Membership.find({ user: userId });
  let validOrgIds = memberships.map((membership) => membership.organization.toString());
  const membershipRoleByOrg = new Map(memberships.map((membership) => [
    membership.organization.toString(),
    membership.role,
  ]));

  if (activeOrgId && validOrgIds.includes(activeOrgId)) {
    validOrgIds = [activeOrgId];
  }

  const targetOrgObjectIds = validOrgIds.map((id) => new mongoose.Types.ObjectId(id));
  const match = { organization: { $in: targetOrgObjectIds } };

  if (query.status && ['active', 'completed', 'paused', 'archived'].includes(query.status)) {
    match.status = query.status;
  }

  if (query.privacy && ['public', 'private'].includes(query.privacy)) {
    match.privacy = query.privacy;
  }

  if (query.lead && mongoose.Types.ObjectId.isValid(query.lead)) {
    match.lead = new mongoose.Types.ObjectId(query.lead);
  }

  if (query.q) {
    const escaped = String(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    match.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
    ];
  }

  const privateAccessConditions = validOrgIds
    .filter((orgId) => !['owner', 'admin'].includes(membershipRoleByOrg.get(orgId)))
    .map((orgId) => ({
      organization: new mongoose.Types.ObjectId(orgId),
      privacy: 'private',
      'members.user': { $ne: new mongoose.Types.ObjectId(userId) },
      lead: { $ne: new mongoose.Types.ObjectId(userId) },
    }));

  const sortMap = {
    name: { name: 1 },
    'name-desc': { name: -1 },
    dueDate: { dueDate: 1, updatedAt: -1 },
    'dueDate-desc': { dueDate: -1, updatedAt: -1 },
    createdAt: { createdAt: -1 },
    updatedAt: { updatedAt: -1 },
  };
  const sort = sortMap[query.sort] || { updatedAt: -1 };

  return Project.aggregate([
    { $match: match },
    ...(privateAccessConditions.length > 0 ? [{ $match: { $nor: privateAccessConditions } }] : []),
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
        startDate: 1,
        color: 1,
        status: 1,
        lead: 1,
        organization: 1,
        privacy: 1,
        tags: 1,
        isTemplate: 1,
        members: 1,
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
    { $sort: sort },
  ]);
};

const duplicateProject = async ({ projectId, userId, body }) => {
  const { project: sourceProject } = await ensureProjectAccess(userId, projectId, 'Source project not found');
  const requestedStartDate = toDate(body.startDate);
  const requestedDueDate = toDate(body.dueDate);
  const sourceStartDate = toDate(sourceProject.startDate);
  const sourceDueDate = toDate(sourceProject.dueDate);
  const scheduleAnchorOffset = requestedStartDate && sourceStartDate
    ? requestedStartDate.getTime() - sourceStartDate.getTime()
    : requestedDueDate && sourceDueDate
      ? requestedDueDate.getTime() - sourceDueDate.getTime()
      : 0;

  const memberIds = new Set(
    (Array.isArray(body.members) ? body.members : [])
      .map((memberId) => memberId?.toString())
      .filter(Boolean),
  );
  memberIds.add(userId.toString());
  if (body.lead) memberIds.add(body.lead.toString());
  for (const member of sourceProject.members || []) {
    if (member.user) memberIds.add(member.user.toString());
  }

  const newProject = await Project.create({
    name: body.name || `${sourceProject.name} (Copy)`,
    description: sourceProject.description,
    organization: sourceProject.organization,
    lead: body.lead || userId,
    startDate: requestedStartDate || shiftDate(sourceProject.startDate, scheduleAnchorOffset),
    dueDate: requestedDueDate || shiftDate(sourceProject.dueDate, scheduleAnchorOffset),
    color: sourceProject.color,
    defaultView: sourceProject.defaultView,
    privacy: body.privacy || sourceProject.privacy,
    members: [...memberIds].map((memberId) => ({
      user: memberId,
      role: memberId === userId.toString() ? 'owner' : 'editor',
    })),
    tags: sourceProject.tags,
    isTemplate: body.isTemplate || false,
    workflowStatuses: sourceProject.workflowStatuses,
    customFields: sourceProject.customFields,
  });

  const sourceTasks = await Task.find({ project: sourceProject._id }).sort({ index: 1, createdAt: 1 });

  if (sourceTasks.length > 0) {
    const newTasksData = sourceTasks.map((task) => ({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      startDate: shiftDate(task.startDate, scheduleAnchorOffset),
      dueDate: shiftDate(task.dueDate, scheduleAnchorOffset),
      index: task.index,
      organization: task.organization,
      project: newProject._id,
      projectMemberships: [{ project: newProject._id }],
      reporter: userId,
      assignee: task.assignee,
      tags: task.tags,
      subtasks: task.subtasks,
      isMilestone: task.isMilestone,
      customFieldValues: task.customFieldValues,
    }));

    const newTasks = await Task.insertMany(newTasksData);
    const taskIdMap = new Map(sourceTasks.map((task, index) => [task._id.toString(), newTasks[index]._id]));
    await Promise.all(newTasks.map((task, index) => {
      const remappedDependencies = (sourceTasks[index].dependencies || [])
        .map((dependencyId) => taskIdMap.get(dependencyId.toString()))
        .filter(Boolean);
      if (remappedDependencies.length === 0) return null;
      return Task.findByIdAndUpdate(task._id, { dependencies: remappedDependencies });
    }).filter(Boolean));
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
