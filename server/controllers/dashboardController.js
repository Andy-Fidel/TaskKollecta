const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Membership = require('../models/Membership');
const Activity = require('../models/Activity');

// @desc    Get comprehensive dashboard stats with filtering
// @route   GET /api/dashboard
const getDashboardStats = async (req, res) => {
  const userId = req.user._id;
  
  // Default to Last 30 Days if no dates provided
  const endDate = req.query.end ? new Date(req.query.end) : new Date();
  const startDate = req.query.start ? new Date(req.query.start) : new Date();
  if (!req.query.start) startDate.setDate(startDate.getDate() - 30);

  // Set times to start/end of day
  startDate.setHours(0,0,0,0);
  endDate.setHours(23,59,59,999);

  try {
    const memberships = await Membership.find({ user: userId });
    const orgIds = memberships.map(m => m.organization);

    
    const totalProjects = await Project.countDocuments({ organization: { $in: orgIds } });
    
    // Tasks assigned to user
    const assignedTasksCount = await Task.countDocuments({ assignee: userId });
    
    // Active: Not done
    const activeTasksCount = await Task.countDocuments({ 
      assignee: userId, 
      status: { $ne: 'done' } 
    });

    // Overdue: Not done AND Due date is in the past
    const overdueCount = await Task.countDocuments({
      assignee: userId,
      status: { $ne: 'done' },
      dueDate: { $lt: new Date() } 
    });

    // Completed: Status done AND updated within Date Range
    const completedTasksCount = await Task.countDocuments({ 
      assignee: userId, 
      status: 'done',
      updatedAt: { $gte: startDate, $lte: endDate }
    });

    const completionRate = assignedTasksCount === 0 
      ? 0 
      : Math.round((completedTasksCount / assignedTasksCount) * 100);

    const teamCount = (await Membership.distinct('user', { organization: { $in: orgIds } })).length;

    // Productivity (Completed by Day in Range)
    const productivityData = await Task.aggregate([
      {
        $match: {
          assignee: userId,
          status: 'done',
          updatedAt: { $gte: startDate, $lte: endDate }
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

    //  Tasks by Project (Pie Chart Data)
    const tasksByProject = await Task.aggregate([
      {
        $match: {
          assignee: userId,
          status: { $ne: 'done' } 
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

    // Activity & Today's Tasks (Standard)
    const todaysTasks = await Task.find({
      assignee: userId,
      status: { $ne: 'done' },
      dueDate: { $gte: new Date().setHours(0,0,0,0), $lte: new Date().setHours(23,59,59,999) }
    }).populate('project', 'name');

    const allOrgTasks = await Task.find({ organization: { $in: orgIds } }).select('_id');
    const recentActivities = await Activity.find({ task: { $in: allOrgTasks.map(t => t._id) } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name avatar')
      .populate({ path: 'task', select: 'title project', populate: { path: 'project', select: 'name' } });

    const recentProjects = await Project.find({ organization: { $in: orgIds } }).sort({ updatedAt: -1 }).limit(3);

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
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardStats };