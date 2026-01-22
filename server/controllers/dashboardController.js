const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Membership = require('../models/Membership');
const Activity = require('../models/Activity');

// @desc    Get comprehensive dashboard stats with filtering
// @route   GET /api/dashboard
const getDashboardStats = async (req, res) => {
  const userId = req.user._id;
  const activeOrgId = req.headers['x-active-org'];

  // 1. Initialize Dates (moved up so they are defined)
  const endDate = req.query.end ? new Date(req.query.end) : new Date();
  const startDate = req.query.start ? new Date(req.query.start) : new Date();
  if (!req.query.start) startDate.setDate(startDate.getDate() - 30);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  try {
    // 2. Fetch Memberships ONCE
    const memberships = await Membership.find({ user: userId });

    // 3. Determine Target Orgs (Filter Logic)
    let targetOrgIds = memberships.map(m => m.organization.toString());

    // If user selected an org in UI, and they are actually a member of it, filter to just that one
    if (activeOrgId && targetOrgIds.includes(activeOrgId)) {
      targetOrgIds = [activeOrgId];
    }



    // Stats: Total Projects
    const totalProjects = await Project.countDocuments({ organization: { $in: targetOrgIds } });

    // Stats: Assigned to Me (Filtered by Org)
    const assignedTasksCount = await Task.countDocuments({
      assignee: userId,
      organization: { $in: targetOrgIds }
    });

    // Stats: Active Tasks (Filtered)
    const activeTasksCount = await Task.countDocuments({
      assignee: userId,
      status: { $ne: 'done' },
      organization: { $in: targetOrgIds }
    });

    // Stats: Overdue
    const overdueCount = await Task.countDocuments({
      assignee: userId,
      status: { $ne: 'done' },
      dueDate: { $lt: new Date() },
      organization: { $in: targetOrgIds }
    });

    // Stats: Completed in Period
    const completedTasksCount = await Task.countDocuments({
      assignee: userId,
      status: 'done',
      updatedAt: { $gte: startDate, $lte: endDate },
      organization: { $in: targetOrgIds }
    });

    const completionRate = assignedTasksCount === 0
      ? 0
      : Math.round((completedTasksCount / assignedTasksCount) * 100);

    const teamCount = (await Membership.distinct('user', { organization: { $in: targetOrgIds } })).length;

    // Chart 1: Productivity (Filtered)
    const productivityData = await Task.aggregate([
      {
        $match: {
          assignee: userId,
          status: 'done',
          updatedAt: { $gte: startDate, $lte: endDate },
          organization: { $in: targetOrgIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Chart 2: Tasks by Project (Filtered)
    const tasksByProject = await Task.aggregate([
      {
        $match: {
          assignee: userId,
          status: { $ne: 'done' },
          organization: { $in: targetOrgIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'projectData'
        }
      },
      { $unwind: '$projectData' },
      {
        $group: {
          _id: '$projectData.name',
          count: { $sum: 1 }
        }
      }
    ]);

    // Today's Tasks
    const todaysTasks = await Task.find({
      assignee: userId,
      status: { $ne: 'done' },
      dueDate: { $gte: new Date().setHours(0, 0, 0, 0), $lte: new Date().setHours(23, 59, 59, 999) },
      organization: { $in: targetOrgIds }
    }).populate('project', 'name');

    // Recent Activities (Complex Filter: Only show activities for tasks in target Orgs)
    const allOrgTasks = await Task.find({ organization: { $in: targetOrgIds } }).select('_id');
    const recentActivities = await Activity.find({ task: { $in: allOrgTasks.map(t => t._id) } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name avatar')
      .populate({ path: 'task', select: 'title project', populate: { path: 'project', select: 'name' } });

    const recentProjects = await getRecentProjectsWithProgress(targetOrgIds);

    res.json({
      stats: {
        totalProjects,
        activeTasks: activeTasksCount,
        overdue: overdueCount,
        completedInPeriod: completedTasksCount,
        teamMembers: teamCount,
        completionRate
      },
      charts: {
        productivity: productivityData.map(d => ({ name: d._id, value: d.count })),
        byProject: tasksByProject.map(d => ({ name: d._id, value: d.count }))
      },
      recentProjects,
      todaysTasks,
      recentActivities
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getRecentProjectsWithProgress = async (targetOrgIds) => {
  const projects = await Project.find({ organization: { $in: targetOrgIds } })
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate('lead', 'name avatar');

  // Calculate progress for each
  const projectsWithProgress = await Promise.all(projects.map(async (p) => {
    const total = await Task.countDocuments({ project: p._id });
    const completed = await Task.countDocuments({ project: p._id, status: 'done' });
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      ...p.toObject(),
      progress,
      totalTasks: total,
      completedTasks: completed
    };
  }));

  return projectsWithProgress;
};

module.exports = { getDashboardStats };