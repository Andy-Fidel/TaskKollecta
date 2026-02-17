const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Membership = require('../models/Membership');

// @desc    Get sprint/burndown analytics for a project
// @route   GET /api/analytics/sprint/:projectId?start=...&end=...
const getSprintAnalytics = async (req, res) => {
  try {
    const projectId = new mongoose.Types.ObjectId(req.params.projectId);

    // Verify access
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const membership = await Membership.findOne({
      user: req.user._id,
      organization: project.organization
    });
    if (!membership) return res.status(403).json({ message: 'Access denied' });

    // Date range
    const end = req.query.end ? new Date(req.query.end) : new Date();
    const start = req.query.start ? new Date(req.query.start) : new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Summary stats
    const totalTasks = await Task.countDocuments({ project: projectId, archived: { $ne: true } });
    const completedTasks = await Task.countDocuments({ project: projectId, status: 'done', archived: { $ne: true } });
    const inProgressTasks = await Task.countDocuments({ project: projectId, status: 'in-progress', archived: { $ne: true } });

    // --- BURNDOWN DATA ---
    // Tasks completed per day in range
    const completionsByDay = await Task.aggregate([
      {
        $match: {
          project: projectId,
          status: 'done',
          updatedAt: { $gte: start, $lte: end },
          archived: { $ne: true }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Tasks created per day in range
    const creationsByDay = await Task.aggregate([
      {
        $match: {
          project: projectId,
          createdAt: { $gte: start, $lte: end },
          archived: { $ne: true }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Count tasks that existed before the sprint start
    const tasksBeforeStart = await Task.countDocuments({
      project: projectId,
      createdAt: { $lt: start },
      archived: { $ne: true }
    });
    const completedBeforeStart = await Task.countDocuments({
      project: projectId,
      status: 'done',
      updatedAt: { $lt: start },
      archived: { $ne: true }
    });
    const remainingAtStart = tasksBeforeStart - completedBeforeStart;

    // Build daily burndown
    const completionsMap = new Map(completionsByDay.map(d => [d._id, d.count]));
    const creationsMap = new Map(creationsByDay.map(d => [d._id, d.count]));

    const burndown = [];
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    let remaining = remainingAtStart;
    const totalAtStart = remainingAtStart;

    for (let i = 0; i < days; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Add new tasks, subtract completions
      remaining += (creationsMap.get(dateStr) || 0);
      remaining -= (completionsMap.get(dateStr) || 0);

      const ideal = Math.max(0, totalAtStart - (totalAtStart / (days - 1)) * i);

      burndown.push({
        date: dateStr,
        remaining: Math.max(0, remaining),
        ideal: Math.round(ideal * 10) / 10
      });
    }

    // --- VELOCITY DATA ---
    // Tasks completed per week in range
    const velocity = await Task.aggregate([
      {
        $match: {
          project: projectId,
          status: 'done',
          updatedAt: { $gte: start, $lte: end },
          archived: { $ne: true }
        }
      },
      {
        $group: {
          _id: { $isoWeek: '$updatedAt' },
          year: { $first: { $isoWeekYear: '$updatedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { year: 1, _id: 1 } }
    ]);

    const velocityData = velocity.map(v => ({
      week: `W${v._id}`,
      completed: v.count
    }));

    const avgVelocity = velocityData.length > 0
      ? Math.round(velocityData.reduce((sum, v) => sum + v.completed, 0) / velocityData.length)
      : 0;

    res.json({
      summary: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
        avgVelocity
      },
      burndown,
      velocity: velocityData
    });
  } catch (error) {
    console.error('Sprint analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get workload distribution for a project
// @route   GET /api/analytics/workload/:projectId
const getWorkloadAnalytics = async (req, res) => {
  try {
    const projectId = new mongoose.Types.ObjectId(req.params.projectId);

    // Verify access
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const membership = await Membership.findOne({
      user: req.user._id,
      organization: project.organization
    });
    if (!membership) return res.status(403).json({ message: 'Access denied' });

    // Aggregate tasks by assignee and status
    const workload = await Task.aggregate([
      {
        $match: {
          project: projectId,
          archived: { $ne: true },
          assignee: { $ne: null }
        }
      },
      {
        $group: {
          _id: { assignee: '$assignee', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Unassigned count
    const unassigned = await Task.aggregate([
      {
        $match: {
          project: projectId,
          archived: { $ne: true },
          assignee: null
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get unique assignee IDs
    const assigneeIds = [...new Set(workload.map(w => w._id.assignee.toString()))];

    // Populate member info
    const User = require('../models/User');
    const members = await User.find({ _id: { $in: assigneeIds } }).select('name avatar email');
    const memberMap = new Map(members.map(m => [m._id.toString(), m]));

    // Build per-member data
    const memberData = {};
    workload.forEach(w => {
      const id = w._id.assignee.toString();
      if (!memberData[id]) {
        const member = memberMap.get(id);
        memberData[id] = {
          member: member ? { _id: id, name: member.name, avatar: member.avatar } : { _id: id, name: 'Unknown' },
          todo: 0, 'in-progress': 0, review: 0, done: 0, total: 0
        };
      }
      memberData[id][w._id.status] = w.count;
      memberData[id].total += w.count;
    });

    // Build unassigned data
    const unassignedData = { todo: 0, 'in-progress': 0, review: 0, done: 0, total: 0 };
    unassigned.forEach(u => {
      unassignedData[u._id] = u.count;
      unassignedData.total += u.count;
    });

    // Sort by total tasks descending
    const sortedMembers = Object.values(memberData).sort((a, b) => b.total - a.total);

    res.json({
      members: sortedMembers,
      unassigned: unassignedData
    });
  } catch (error) {
    console.error('Workload analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSprintAnalytics, getWorkloadAnalytics };
