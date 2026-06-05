const Automation = require('../models/Automation');
const Project = require('../models/Project');
const Membership = require('../models/Membership');

const canManageProject = (project, membership, userId) => {
  const projectRole = project.members?.find((member) => member.user?.toString() === userId.toString())?.role;
  return ['owner', 'admin'].includes(membership.role)
    || ['owner', 'admin'].includes(projectRole)
    || project.lead?.toString() === userId.toString();
};

const ensureProjectAccess = async (userId, projectId, { manage = false } = {}) => {
  const project = await Project.findById(projectId).select('organization privacy members lead workflowStatuses customFields tags');
  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  const membership = await Membership.findOne({ user: userId, organization: project.organization });
  if (!membership) {
    const error = new Error('Access denied');
    error.status = 403;
    throw error;
  }

  const projectMember = project.members?.find((member) => member.user?.toString() === userId.toString());
  const canAccessPrivateProject = project.privacy !== 'private'
    || ['owner', 'admin'].includes(membership.role)
    || Boolean(projectMember)
    || project.lead?.toString() === userId.toString();

  if (!canAccessPrivateProject) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }

  if (manage && !canManageProject(project, membership, userId)) {
    const error = new Error('Only project admins, project owners, organization admins, or the project lead can manage automations');
    error.status = 403;
    throw error;
  }

  return project;
};

const normalizeArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const normalizeAutomationPayload = (body) => {
  const triggers = normalizeArray(body.triggers);
  const conditions = normalizeArray(body.conditions);
  const actions = normalizeArray(body.actions);

  const normalizedTriggers = triggers.length > 0
    ? triggers.map((trigger) => ({
      type: trigger.type || trigger.triggerType,
      value: trigger.value ?? trigger.triggerValue ?? 'any',
      fieldKey: trigger.fieldKey
    }))
    : [{
      type: body.triggerType,
      value: body.triggerValue || 'any'
    }];

  const normalizedActions = actions.length > 0
    ? actions.map((action) => ({
      type: action.type || action.actionType,
      value: action.value ?? action.actionValue,
      fieldKey: action.fieldKey
    }))
    : [{
      type: body.actionType,
      value: body.actionValue
    }];

  return {
    name: body.name,
    description: body.description,
    triggers: normalizedTriggers,
    conditions,
    actions: normalizedActions,
    triggerType: normalizedTriggers[0]?.type,
    triggerValue: normalizedTriggers[0]?.value || 'any',
    actionType: normalizedActions[0]?.type,
    actionValue: normalizedActions[0]?.value,
    isActive: body.isActive
  };
};

const respondWithError = (res, error) => {
  res.status(error.status || 500).json({ message: error.message });
};

// @desc Get project automations
const getAutomations = async (req, res) => {
  try {
    await ensureProjectAccess(req.user._id, req.params.projectId);
    const automations = await Automation.find({ project: req.params.projectId })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(automations);
  } catch (error) { respondWithError(res, error); }
};

// @desc Create automation
const createAutomation = async (req, res) => {
  try {
    await ensureProjectAccess(req.user._id, req.body.projectId, { manage: true });
    const payload = normalizeAutomationPayload(req.body);
    const automation = await Automation.create({
      project: req.body.projectId,
      ...payload,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });
    res.status(201).json(automation);
  } catch (error) { respondWithError(res, error); }
};

// @desc Update automation
const updateAutomation = async (req, res) => {
  try {
    const existing = await Automation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Automation not found' });

    await ensureProjectAccess(req.user._id, existing.project, { manage: true });
    const payload = normalizeAutomationPayload({
      ...existing.toObject(),
      ...req.body
    });

    Object.assign(existing, {
      ...payload,
      isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : existing.isActive,
      updatedBy: req.user._id
    });

    await existing.save();
    res.json(existing);
  } catch (error) { respondWithError(res, error); }
};

// @desc Delete automation
const deleteAutomation = async (req, res) => {
    try {
        const automation = await Automation.findById(req.params.id);
        if (!automation) return res.status(404).json({ message: 'Automation not found' });

        await ensureProjectAccess(req.user._id, automation.project, { manage: true });
        await automation.deleteOne();
        res.json({ message: 'Deleted' });
    } catch (error) { respondWithError(res, error); }
};

module.exports = { getAutomations, createAutomation, updateAutomation, deleteAutomation };
