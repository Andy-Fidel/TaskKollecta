const Project = require('../models/Project');
const Task = require('../models/Task');
const ProjectUpdate = require('../models/ProjectUpdate');
const Membership = require('../models/Membership');
const mongoose = require('mongoose');
const { invalidateProjectCache } = require('../utils/cacheUtils');

// @desc    Create a new project
// @route   POST /api/projects
const createProject = async (req, res) => {
  const { name, description, orgId, lead, dueDate, color } = req.body;

  try {
    const project = await Project.create({
      name,
      description,
      organization: orgId,
      // Use provided lead OR default to creator
      lead: lead || req.user._id,
      dueDate,
      color
    });

    // Populate the lead immediately for the frontend
    const populatedProject = await Project.findById(project._id).populate('lead', 'name avatar');

    // Invalidate project cache for all users
    await invalidateProjectCache(orgId);

    res.status(201).json(populatedProject);
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
    // SECURITY: Verify user is a member of this organization
    const membership = await Membership.findOne({
      user: req.user._id,
      organization: orgId
    });
    
    if (!membership) {
      return res.status(403).json({ message: 'Not authorized to view projects of this organization' });
    }

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

    // SECURITY: Verify user is a member of the project's organization
    const membership = await Membership.findOne({
      user: req.user._id,
      organization: project.organization
    });
    if (!membership) {
      return res.status(403).json({ message: 'Access denied' });
    }

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

    // SECURITY: Get project and verify membership
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const membership = await Membership.findOne({
      user: req.user._id,
      organization: project.organization
    });
    if (!membership) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const statusStats = await Task.aggregate([
      { $match: { project: projectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const priorityStats = await Task.aggregate([
      { $match: { project: projectId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

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
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Permission Check: Owner/Admin only
    const membership = await Membership.findOne({
      user: req.user._id,
      organization: project.organization
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Not authorized to update project' });
    }

    // Whitelist allowed update fields
    const allowedFields = ['name', 'description', 'color', 'dueDate', 'lead', 'status'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    // Invalidate project cache
    await invalidateProjectCache(project.organization);

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete project (and its tasks)
// @route   DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Permission Check: Owner/Admin only
    const membership = await Membership.findOne({
      user: req.user._id,
      organization: project.organization
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Not authorized to delete project' });
    }

    await Task.deleteMany({ project: req.params.id });


    await Project.findByIdAndDelete(req.params.id);

    // Invalidate project cache
    await invalidateProjectCache(project.organization);

    res.json({ message: 'Project and tasks deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get ALL projects for the logged-in user (Filtered by Active Org)
// @route   GET /api/projects
const getAllProjects = async (req, res) => {
  try {
    const userId = req.user._id;
    const activeOrgId = req.headers['x-active-org'];

    // Fetch User's Memberships
    const memberships = await Membership.find({ user: userId });

    // Logic to Determine Target Organization(s)
    // Convert all membership org IDs to strings for comparison
    let validOrgIds = memberships.map(m => m.organization.toString());

    // If header exists AND user is actually a member of that org, filter to just that one.
    if (activeOrgId && validOrgIds.includes(activeOrgId)) {
      validOrgIds = [activeOrgId];
    }

    // Convert back to Mongoose ObjectIds for the Aggregation Pipeline
    // (Aggregations often require exact ObjectId types to match correctly)
    const targetOrgObjectIds = validOrgIds.map(id => new mongoose.Types.ObjectId(id));

    const projects = await Project.aggregate([
      { $match: { organization: { $in: targetOrgObjectIds } } },

      // Join with Tasks to calculate stats
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'project',
          as: 'projectTasks'
        }
      },

      // Calculate Progress & Identify Team
      {
        $addFields: {
          totalTasks: { $size: '$projectTasks' },
          completedTasks: {
            $size: {
              $filter: {
                input: '$projectTasks',
                as: 't',
                cond: { $eq: ['$$t.status', 'done'] }
              }
            }
          },
          // Get unique IDs of everyone assigned to tasks in this project
          assigneeIds: {
            $filter: {
              input: { $setUnion: '$projectTasks.assignee' },
              as: 'id',
              cond: { $ne: ['$$id', null] }
            }
          }
        }
      },

      // Join with Users to get Avatar/Name for the team
      {
        $lookup: {
          from: 'users',
          localField: 'assigneeIds',
          foreignField: '_id',
          as: 'team'
        }
      },

      // Clean up output
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
          team: { name: 1, avatar: 1, _id: 1 },
          progress: {
            $cond: [
              { $eq: ['$totalTasks', 0] },
              0,
              { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] }
            ]
          }
        }
      },
      { $sort: { updatedAt: -1 } }
    ]);

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProject,
  getOrgProjects, getProjectDetails,
  getProjectAnalytics, createUpdate,
  getUpdates, updateProject, deleteProject, getAllProjects
};