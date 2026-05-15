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

    // Chart 3: Tasks by Priority (for Priority Breakdown chart)
    const tasksByPriority = await Task.aggregate([
      {
        $match: {
          assignee: userId,
          status: { $ne: 'done' },
          organization: { $in: targetOrgIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Chart 4: Tasks by Project × Status (for Stacked Bar chart)
    const tasksByProjectStatus = await Task.aggregate([
      {
        $match: {
          assignee: userId,
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
          _id: { project: '$projectData.name', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Transform byProjectStatus into [{name, todo, 'in-progress', review, done}, ...]
    const projectStatusMap = {};
    tasksByProjectStatus.forEach(d => {
      const proj = d._id.project;
      if (!projectStatusMap[proj]) projectStatusMap[proj] = { name: proj, todo: 0, 'in-progress': 0, review: 0, done: 0 };
      projectStatusMap[proj][d._id.status] = d.count;
    });
    const byProjectStatus = Object.values(projectStatusMap);

    // Today's Tasks
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaysTasks = await Task.find({
      assignee: userId,
      status: { $ne: 'done' },
      dueDate: { $gte: todayStart, $lte: todayEnd },
      organization: { $in: targetOrgIds }
    }).populate('project', 'name');

    const focusCandidates = await Task.find({
      assignee: userId,
      status: { $ne: 'done' },
      organization: { $in: targetOrgIds },
      $or: [
        { dueDate: { $lte: todayEnd } },
        { priority: { $in: ['urgent', 'high'] } },
        { dependencies: { $exists: true, $ne: [] } },
      ],
    })
      .populate('project', 'name')
      .populate('dependencies', 'title status')
      .limit(30)
      .lean();

    const todayFocusTasks = focusCandidates
      .map((task) => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const incompleteDependencies = (task.dependencies || []).filter((dependency) => dependency?.status !== 'done');
        const overdue = dueDate ? dueDate < todayStart : false;
        const dueToday = dueDate ? dueDate >= todayStart && dueDate <= todayEnd : false;
        const blocked = incompleteDependencies.length > 0;

        let focusReason = 'High priority';
        let focusScore = 1;
        if (task.priority === 'urgent') focusScore += 40;
        if (task.priority === 'high') focusScore += 25;
        if (blocked) {
          focusReason = 'Blocked';
          focusScore += 35;
        }
        if (dueToday) {
          focusReason = 'Due today';
          focusScore += 30;
        }
        if (overdue) {
          focusReason = 'Overdue';
          focusScore += 50;
        }

        return {
          ...task,
          focusReason,
          focusScore,
          blocked,
          blockerCount: incompleteDependencies.length,
        };
      })
      .sort((a, b) => {
        if (b.focusScore !== a.focusScore) return b.focusScore - a.focusScore;
        return new Date(a.dueDate || 8640000000000000) - new Date(b.dueDate || 8640000000000000);
      })
      .slice(0, 6);

    // Recent Activities (Complex Filter: Only show activities for tasks in target Orgs)
    const allOrgTasks = await Task.find({ organization: { $in: targetOrgIds } }).select('_id');
    const recentActivities = await Activity.find({ task: { $in: allOrgTasks.map(t => t._id) } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name avatar')
      .populate({ path: 'task', select: 'title project', populate: { path: 'project', select: 'name' } });

    const recentProjects = await getRecentProjectsWithProgress(targetOrgIds);
    const projectRiskRadar = await getProjectRiskRadar(targetOrgIds);
    const weekPlanner = await getWeekPlannerTasks({ userId, targetOrgIds, todayStart, todayEnd });

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
        byProject: tasksByProject.map(d => ({ name: d._id, value: d.count })),
        byPriority: tasksByPriority.map(d => ({ name: d._id || 'none', value: d.count })),
        byProjectStatus
      },
      recentProjects,
      projectRiskRadar,
      weekPlanner,
      todaysTasks,
      todayFocusTasks,
      recentActivities
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getWeekPlannerTasks = async ({ userId, targetOrgIds, todayStart, todayEnd }) => {
  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const baseMatch = {
    assignee: userId,
    status: { $ne: 'done' },
    organization: { $in: targetOrgIds },
  };

  const [today, upcoming, unscheduledHighPriority] = await Promise.all([
    Task.find({
      ...baseMatch,
      dueDate: { $gte: todayStart, $lte: todayEnd },
    })
      .populate('project', 'name')
      .sort({ priority: 1, dueDate: 1 })
      .limit(5)
      .lean(),
    Task.find({
      ...baseMatch,
      dueDate: { $gt: todayEnd, $lte: weekEnd },
    })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .limit(5)
      .lean(),
    Task.find({
      ...baseMatch,
      dueDate: { $in: [null, undefined] },
      priority: { $in: ['urgent', 'high'] },
    })
      .populate('project', 'name')
      .sort({ priority: 1, updatedAt: -1 })
      .limit(5)
      .lean(),
  ]);

  return {
    today,
    upcoming,
    unscheduledHighPriority,
    totals: {
      today: today.length,
      upcoming: upcoming.length,
      unscheduledHighPriority: unscheduledHighPriority.length,
    },
  };
};

const getProjectRiskRadar = async (targetOrgIds) => {
  const projects = await Project.find({
    organization: { $in: targetOrgIds },
    status: { $ne: 'archived' },
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select('name status color dueDate updatedAt');

  const now = new Date();
  const staleCutoff = new Date(now);
  staleCutoff.setDate(staleCutoff.getDate() - 7);

  const radar = await Promise.all(projects.map(async (project) => {
    const taskMatch = { project: project._id };
    const activeMatch = { ...taskMatch, status: { $ne: 'done' } };

    const [totalTasks, completedTasks, overdueTasks, priorityTasks, dependencyTasks] = await Promise.all([
      Task.countDocuments(taskMatch),
      Task.countDocuments({ ...taskMatch, status: 'done' }),
      Task.countDocuments({ ...activeMatch, dueDate: { $lt: now } }),
      Task.countDocuments({ ...activeMatch, priority: { $in: ['urgent', 'high'] } }),
      Task.find({ ...activeMatch, dependencies: { $exists: true, $ne: [] } })
        .populate('dependencies', 'status')
        .select('dependencies')
        .lean(),
    ]);

    const blockedTasks = dependencyTasks.filter((task) => (
      (task.dependencies || []).some((dependency) => dependency?.status !== 'done')
    )).length;

    const completion = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    const stale = project.updatedAt < staleCutoff;
    const dueDate = project.dueDate ? new Date(project.dueDate) : null;
    const projectOverdue = dueDate ? dueDate < now && project.status !== 'completed' : false;

    const reasons = [];
    let riskScore = 0;

    if (overdueTasks > 0) {
      riskScore += overdueTasks * 18;
      reasons.push(`${overdueTasks} overdue`);
    }
    if (blockedTasks > 0) {
      riskScore += blockedTasks * 16;
      reasons.push(`${blockedTasks} blocked`);
    }
    if (priorityTasks > 0) {
      riskScore += priorityTasks * 8;
      reasons.push(`${priorityTasks} high priority`);
    }
    if (projectOverdue) {
      riskScore += 25;
      reasons.push('project due date passed');
    }
    if (stale && totalTasks > completedTasks) {
      riskScore += 12;
      reasons.push('no recent updates');
    }
    if (totalTasks > 0 && completion < 35) {
      riskScore += 10;
      reasons.push('low completion');
    }

    let riskLevel = 'low';
    if (riskScore >= 65) riskLevel = 'critical';
    else if (riskScore >= 35) riskLevel = 'high';
    else if (riskScore >= 15) riskLevel = 'medium';

    return {
      _id: project._id,
      name: project.name,
      color: project.color,
      status: project.status,
      dueDate: project.dueDate,
      totalTasks,
      completedTasks,
      completion,
      overdueTasks,
      blockedTasks,
      priorityTasks,
      riskScore,
      riskLevel,
      reasons,
    };
  }));

  return radar
    .filter((project) => project.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);
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
