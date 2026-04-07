const projectService = require('./projectService');
const { handleDomainError } = require('../shared/errors');

// @desc    Create a new project
// @route   POST /api/projects
const createProject = async (req, res) => {
  try {
    const project = await projectService.createProject({
      body: req.body,
      userId: req.user._id,
    });
    res.status(201).json(project);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get all projects for an Organization
// @route   GET /api/projects/:orgId
// @access  Private + Org Member
const getOrgProjects = async (req, res) => {
  const { orgId } = req.params;

  try {
    const projects = await projectService.getOrgProjects({ orgId, userId: req.user._id });
    res.status(200).json(projects);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get single project details
// @route   GET /api/projects/single/:id
const getProjectDetails = async (req, res) => {
  try {
    const project = await projectService.getProjectDetails({ projectId: req.params.id, userId: req.user._id });
    res.json(project);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get project analytics
// @route   GET /api/projects/analytics/:id
const getProjectAnalytics = async (req, res) => {
  try {
    const { analytics } = await projectService.getProjectAnalytics({
      projectId: req.params.id,
      userId: req.user._id,
    });

    res.status(200).json(analytics);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Post a status update
const createUpdate = async (req, res) => {
  try {
    const update = await projectService.createUpdate({
      projectId: req.params.id,
      userId: req.user._id,
      body: req.body,
    });
    res.status(201).json(update);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get updates for a project
const getUpdates = async (req, res) => {
  try {
    const updates = await projectService.getUpdates({ projectId: req.params.id, userId: req.user._id });
    res.json(updates);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Update project (Name, Color, Archive)
// @route   PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const updatedProject = await projectService.updateProject({
      projectId: req.params.id,
      userId: req.user._id,
      body: req.body,
    });
    res.json(updatedProject);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Delete project (and its tasks)
// @route   DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    const result = await projectService.deleteProject({ projectId: req.params.id, userId: req.user._id });
    res.json(result);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get ALL projects for the logged-in user (Filtered by Active Org)
// @route   GET /api/projects
const getAllProjects = async (req, res) => {
  try {
    const projects = await projectService.getAllProjects({
      userId: req.user._id,
      activeOrgId: req.headers['x-active-org'],
    });
    res.json(projects);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Duplicate a project (and its tasks)
// @route   POST /api/projects/:id/duplicate
const duplicateProject = async (req, res) => {
  try {
    const newProject = await projectService.duplicateProject({
      projectId: req.params.id,
      userId: req.user._id,
      body: req.body,
    });
    res.status(201).json(newProject);
  } catch (error) {
    handleDomainError(res, error);
  }
};

module.exports = {
  createProject,
  getOrgProjects, getProjectDetails,
  getProjectAnalytics, createUpdate,
  getUpdates, updateProject, deleteProject, getAllProjects,
  duplicateProject
};
