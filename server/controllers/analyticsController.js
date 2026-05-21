const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Membership = require('../models/Membership');
const ProductEvent = require('../models/ProductEvent');

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

// @desc    Record a product usage event
// @route   POST /api/analytics/events
const recordProductEvent = async (req, res) => {
  try {
    const { eventName, organizationId, projectId, source = 'web', metadata = {} } = req.body;

    if (!eventName || typeof eventName !== 'string') {
      return res.status(400).json({ message: 'eventName is required' });
    }

    let orgId = organizationId || null;

    if (projectId) {
      const project = await Project.findById(projectId).select('organization');
      if (!project) return res.status(404).json({ message: 'Project not found' });

      const membership = await Membership.findOne({
        user: req.user._id,
        organization: project.organization,
      });
      if (!membership) return res.status(403).json({ message: 'Access denied' });

      orgId = project.organization;
    }

    if (orgId) {
      const membership = await Membership.findOne({
        user: req.user._id,
        organization: orgId,
      });
      if (!membership) return res.status(403).json({ message: 'Access denied' });
    }

    const event = await ProductEvent.create({
      user: req.user._id,
      organization: orgId,
      project: projectId || null,
      eventName,
      source,
      metadata,
    });

    res.status(201).json({ id: event._id });
  } catch (error) {
    console.error('Product event error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get product adoption summary for the active workspace
// @route   GET /api/analytics/product-adoption?orgId=...
const getProductAdoptionAnalytics = async (req, res) => {
  try {
    const { orgId } = req.query;
    if (!orgId) {
      return res.status(400).json({ message: 'orgId is required' });
    }

    const membership = await Membership.findOne({
      user: req.user._id,
      organization: orgId,
    });
    if (!membership) return res.status(403).json({ message: 'Access denied' });

    const eventCounts = await ProductEvent.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgId),
        },
      },
      {
        $group: {
          _id: '$eventName',
          count: { $sum: 1 },
          lastSeenAt: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const milestoneCounts = await ProductEvent.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgId),
          eventName: 'onboarding_milestone_completed',
        },
      },
      {
        $group: {
          _id: '$metadata.milestone',
          count: { $sum: 1 },
          lastSeenAt: { $max: '$createdAt' },
        },
      },
    ]);

    const eventMap = new Map(eventCounts.map((item) => [item._id, {
      count: item.count,
      lastSeenAt: item.lastSeenAt,
    }]));
    const milestoneMap = new Map(milestoneCounts.map((item) => [item._id, {
      count: item.count,
      lastSeenAt: item.lastSeenAt,
    }]));

    const getCount = (eventName) => eventMap.get(eventName)?.count || 0;
    const getLastSeenAt = (eventName) => eventMap.get(eventName)?.lastSeenAt || null;
    const getMilestoneCount = (milestone) => milestoneMap.get(milestone)?.count || 0;
    const getMilestoneLastSeenAt = (milestone) => milestoneMap.get(milestone)?.lastSeenAt || null;

    const activationSteps = [
      {
        id: 'onboarding_completed',
        label: 'Completed onboarding',
        completed: getCount('onboarding_completed') > 0,
        count: getCount('onboarding_completed'),
        lastSeenAt: getLastSeenAt('onboarding_completed'),
      },
      {
        id: 'first_project_created',
        label: 'Created first project',
        completed: getMilestoneCount('first_project_created') > 0,
        count: getMilestoneCount('first_project_created'),
        lastSeenAt: getMilestoneLastSeenAt('first_project_created'),
      },
      {
        id: 'help_wizard_opened',
        label: 'Opened help wizard',
        completed: getCount('help_wizard_opened') > 0,
        count: getCount('help_wizard_opened'),
        lastSeenAt: getLastSeenAt('help_wizard_opened'),
      },
      {
        id: 'saved_view_created',
        label: 'Created a saved view',
        completed: getMilestoneCount('first_saved_view_created') > 0,
        count: getMilestoneCount('first_saved_view_created'),
        lastSeenAt: getMilestoneLastSeenAt('first_saved_view_created'),
      },
      {
        id: 'setup_checklist_action_clicked',
        label: 'Used setup checklist',
        completed: getCount('setup_checklist_action_clicked') > 0,
        count: getCount('setup_checklist_action_clicked'),
        lastSeenAt: getLastSeenAt('setup_checklist_action_clicked'),
      },
    ];

    const completedActivationSteps = activationSteps.filter((step) => step.completed).length;
    const activationScore = activationSteps.length === 0
      ? 0
      : Math.round((completedActivationSteps / activationSteps.length) * 100);

    const helpEngagement = {
      opened: getCount('help_wizard_opened'),
      pathsSelected: getCount('help_wizard_path_selected'),
      workflowsOpened: getCount('help_wizard_workflow_opened'),
    };

    const recommendationMap = {
      onboarding_completed: {
        id: 'review_workspace_setup',
        title: 'Review workspace setup',
        description: 'Confirm the workspace has the right team, projects, and operating views.',
        action: 'navigate',
        route: '/projects',
      },
      first_project_created: {
        id: 'create_first_project',
        title: 'Create the first project',
        description: 'Start one real project so tasks, ownership, and reporting have a home.',
        action: 'open_project_wizard',
        route: '/projects',
      },
      help_wizard_opened: {
        id: 'open_help_wizard',
        title: 'Open the help wizard',
        description: 'Use a guided path to learn how TaskKollecta supports setup, focus, outcomes, and automation.',
        action: 'open_help_wizard',
        route: '/dashboard',
      },
      saved_view_created: {
        id: 'create_saved_view',
        title: 'Create a saved view',
        description: 'Save a project or My Tasks filter so repeat work can be revisited without rebuilding filters.',
        action: 'navigate',
        route: '/tasks',
      },
      setup_checklist_action_clicked: {
        id: 'use_setup_checklist',
        title: 'Use a setup checklist',
        description: 'Follow contextual checklist actions on Projects, My Tasks, Portfolios, or Goals.',
        action: 'navigate',
        route: '/projects',
      },
    };

    const recommendations = activationSteps
      .filter((step) => !step.completed)
      .map((step) => recommendationMap[step.id])
      .filter(Boolean)
      .slice(0, 3);

    res.json({
      activationScore,
      completedActivationSteps,
      totalActivationSteps: activationSteps.length,
      activationSteps,
      helpEngagement,
      recommendations,
      events: eventCounts.map((item) => ({
        eventName: item._id,
        count: item.count,
        lastSeenAt: item.lastSeenAt,
      })),
    });
  } catch (error) {
    console.error('Product adoption analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recent team administration audit events
// @route   GET /api/analytics/team-audit?orgId=...
const getTeamAuditEvents = async (req, res) => {
  try {
    const { orgId } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    if (!orgId) {
      return res.status(400).json({ message: 'orgId is required' });
    }

    const membership = await Membership.findOne({
      user: req.user._id,
      organization: orgId,
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const events = await ProductEvent.find({
      organization: orgId,
      eventName: { $regex: /^organization\./ },
    })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(events.map((event) => ({
      _id: event._id,
      eventName: event.eventName,
      source: event.source,
      metadata: event.metadata || {},
      createdAt: event.createdAt,
      actor: event.user ? {
        _id: event.user._id,
        name: event.user.name,
        email: event.user.email,
        avatar: event.user.avatar,
      } : null,
    })));
  } catch (error) {
    console.error('Team audit events error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSprintAnalytics,
  getWorkloadAnalytics,
  recordProductEvent,
  getProductAdoptionAnalytics,
  getTeamAuditEvents,
};
