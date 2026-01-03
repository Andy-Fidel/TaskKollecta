const Project = require('../models/Project');
const Task = require('../models/Task');
const ProjectUpdate = require('../models/ProjectUpdate');
const mongoose = require('mongoose');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private + Org Member
const createProject = async (req, res) => {
  const { name, description, orgId } = req.body;

  try {
    const project = await Project.create({
      name,
      description,
      organization: orgId,
      lead: req.user._id
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all projects for an Organization
// @route   GET /api/projects/:orgId
// @access  Private + Org Member
const getOrgProjects = async (req, res) => {
  const { orgId } = req.params;

  try {
    const projects = await Project.find({ organization: orgId })
      .populate('lead', 'name email');

    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single project details
// @route   GET /api/projects/single/:id
const getProjectDetails = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get project analytics
// @route   GET /api/projects/analytics/:id
const getProjectAnalytics = async (req, res) => {
  try {
    const projectId = new mongoose.Types.ObjectId(req.params.id);

    // 1. Count by Status
    const statusStats = await Task.aggregate([
      { $match: { project: projectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 2. Count by Priority
    const priorityStats = await Task.aggregate([
      { $match: { project: projectId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // 3. Calculate Completion Rate
    const totalTasks = await Task.countDocuments({ project: projectId });
    const completedTasks = await Task.countDocuments({ project: projectId, status: 'done' });

    res.status(200).json({
      statusDistribution: statusStats,
      priorityDistribution: priorityStats,
      totalTasks,
      completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Post a status update
const createUpdate = async (req, res) => {
  try {
    const update = await ProjectUpdate.create({
      project: req.params.id,
      author: req.user._id,
      status: req.body.status,
      message: req.body.message
    });
    const populated = await ProjectUpdate.findById(update._id).populate('author', 'name avatar');
    res.status(201).json(populated);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Get updates for a project
const getUpdates = async (req, res) => {
  try {
    const updates = await ProjectUpdate.find({ project: req.params.id })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(updates);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Update project (Name, Color, Archive)
// @route   PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body, // { name, color, status, tags }
      { new: true }
    );
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete project (and its tasks)
// @route   DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    // 1. Delete all tasks in this project first
    await Task.deleteMany({ project: req.params.id });
    
    // 2. Delete the project
    await Project.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Project and tasks deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get ALL projects for the logged-in user (across all orgs)
// @route   GET /api/projects
const getAllProjects = async (req, res) => {
  try {
    // Find projects where the user is the lead OR the user belongs to the org
    // For simplicity in this stage, we will return all projects in the user's organizations
    
    // 1. Find all orgs user belongs to
    const memberships = await Membership.find({ user: req.user._id });
    const orgIds = memberships.map(m => m.organization);

    // 2. Find projects in those orgs
    const projects = await Project.find({ organization: { $in: orgIds } })
      .populate('lead', 'name avatar') // Get lead info
      .sort({ updatedAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = { createProject, 
  getOrgProjects, getProjectDetails,
   getProjectAnalytics, createUpdate,
    getUpdates, updateProject, deleteProject, getAllProjects };