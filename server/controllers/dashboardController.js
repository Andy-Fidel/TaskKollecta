const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Membership = require('../models/Membership');
const User = require('../models/User');
const Activity = require('../models/Activity');

// @desc    Get comprehensive dashboard stats
// @route   GET /api/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  const userId = req.user._id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  try {
    // 1. Get User's Organizations
    const memberships = await Membership.find({ user: userId });
    const orgIds = memberships.map(m => m.organization);

    const allOrgTasks = await Task.find({ organization: { $in: orgIds } }).select('_id');
    const allTaskIds = allOrgTasks.map(t => t._id);

    const recentActivities = await Activity.find({ task: { $in: allTaskIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name avatar') 
      .populate({
         path: 'task',
         select: 'title project',
         populate: { path: 'project', select: 'name' } 
      });

    // 2. Calculate Stats Cards
    const totalProjects = await Project.countDocuments({ organization: { $in: orgIds } });
    
    const assignedTasksCount = await Task.countDocuments({ assignee: userId });
    const completedTasksCount = await Task.countDocuments({ assignee: userId, status: 'done' });
    const activeTasksCount = assignedTasksCount - completedTasksCount;
    
    // Calculate Completion Rate
    const completionRate = assignedTasksCount === 0 
      ? 0 
      : Math.round((completedTasksCount / assignedTasksCount) * 100);

    // Calculate Total Team Members (Unique users across all your orgs)
    const uniqueMembers = await Membership.distinct('user', { organization: { $in: orgIds } });
    const teamCount = uniqueMembers.length;

    // 3. Get Recent Projects (Limit 3)
    const recentProjects = await Project.find({ organization: { $in: orgIds } })
      .sort({ updatedAt: -1 })
      .limit(3)
      .populate('organization', 'name'); // To show role or org name if needed

    // 4. Get Today's Tasks
    const todaysTasks = await Task.find({
      assignee: userId,
      status: { $ne: 'done' },
      dueDate: { 
        $gte: todayStart,
        $lte: todayEnd
      }
    }).populate('project', 'name');

    // 5. Generate Chart Data (Tasks Completed per Month - Last 6 Months)
    // This requires a MongoDB Aggregation
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const chartStats = await Task.aggregate([
      {
        $match: {
          assignee: userId,
          status: 'done',
          updatedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $month: "$updatedAt" }, // Group by Month (1-12)
          count: { $sum: 1 }
        }
      }
    ]);

    // Format Chart Data for Recharts (Fill in missing months with 0)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartData = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthIndex = d.getMonth() + 1; // 1-based index for matching
      
      const found = chartStats.find(item => item._id === monthIndex);
      chartData.push({
        name: monthNames[monthIndex - 1],
        value: found ? found.count : 0
      });
    }

    res.json({
      stats: {
        totalProjects,
        activeTasks: activeTasksCount,
        teamMembers: teamCount,
        completionRate
      },
      recentProjects,
      todaysTasks,
      chartData,
      recentActivities
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardStats };