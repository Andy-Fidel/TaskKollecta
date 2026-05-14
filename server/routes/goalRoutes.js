const express = require('express');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const { protect } = require('../middleware/authMiddleware');
const { ensureMembership } = require('../domains/shared/access');

const router = express.Router();

const populateGoal = (query) =>
  query
    .populate('owner', 'name avatar')
    .populate('linkedProjects', 'name color status workflowStatuses')
    .populate('linkedTasks', 'title status');

const withLinkedWorkProgress = async (goal) => {
  const goalObject = goal.toObject ? goal.toObject() : goal;
  let linkedWorkTotal = 0;
  let linkedWorkCompleted = 0;

  for (const project of goalObject.linkedProjects || []) {
    const projectId = project._id || project;
    const match = { $or: [{ project: projectId }, { 'projectMemberships.project': projectId }] };
    const doneStatuses = (project.workflowStatuses || []).filter((status) => status.isDone).map((status) => status.id);
    const completedStatuses = doneStatuses.length ? doneStatuses : ['done'];

    const [total, completed] = await Promise.all([
      Task.countDocuments(match),
      Task.countDocuments({ ...match, status: { $in: completedStatuses } }),
    ]);
    linkedWorkTotal += total;
    linkedWorkCompleted += completed;
  }

  const linkedTasks = goalObject.linkedTasks || [];
  linkedWorkTotal += linkedTasks.length;
  linkedWorkCompleted += linkedTasks.filter((task) => task.status === 'done').length;

  return {
    ...goalObject,
    linkedWorkTotal,
    linkedWorkCompleted,
    linkedWorkProgress: linkedWorkTotal === 0 ? null : Math.round((linkedWorkCompleted / linkedWorkTotal) * 100),
  };
};

router.get('/', protect, async (req, res) => {
  try {
    const orgId = req.query.orgId || req.headers['x-active-org'];
    if (!orgId) return res.status(400).json({ message: 'Organization ID required' });

    await ensureMembership(req.user._id, orgId);
    const goals = await populateGoal(Goal.find({ organization: orgId }).sort({ updatedAt: -1 }));
    res.json(await Promise.all(goals.map(withLinkedWorkProgress)));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { title, description, orgId, targetDate, status, progress, linkedProjects, linkedTasks } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });

    await ensureMembership(req.user._id, orgId);
    const goal = await Goal.create({
      title: title.trim(),
      description,
      organization: orgId,
      owner: req.user._id,
      targetDate,
      status,
      progress,
      linkedProjects: Array.isArray(linkedProjects) ? linkedProjects : [],
      linkedTasks: Array.isArray(linkedTasks) ? linkedTasks : [],
    });

    const populated = await populateGoal(Goal.findById(goal._id));
    res.status(201).json(await withLinkedWorkProgress(populated));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    await ensureMembership(req.user._id, goal.organization);
    const allowed = ['title', 'description', 'targetDate', 'status', 'progress', 'linkedProjects', 'linkedTasks'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) goal[field] = req.body[field];
    }
    await goal.save();

    const populated = await populateGoal(Goal.findById(goal._id));
    res.json(await withLinkedWorkProgress(populated));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    await ensureMembership(req.user._id, goal.organization);
    await goal.deleteOne();
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

module.exports = router;
