const express = require('express');
const Portfolio = require('../models/Portfolio');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect } = require('../middleware/authMiddleware');
const { ensureMembership } = require('../domains/shared/access');

const router = express.Router();

const buildPortfolioSummary = async (portfolio) => {
  const projectIds = portfolio.projects || [];
  const projects = await Project.find({ _id: { $in: projectIds } }).select('name status color dueDate workflowStatuses');

  let totalTasks = 0;
  let completedTasks = 0;

  for (const project of projects) {
    const match = { $or: [{ project: project._id }, { 'projectMemberships.project': project._id }] };
    const doneStatuses = (project.workflowStatuses || [])
      .filter((status) => status.isDone)
      .map((status) => status.id);
    const completedStatuses = doneStatuses.length ? doneStatuses : ['done'];

    const [projectTotal, projectCompleted] = await Promise.all([
      Task.countDocuments(match),
      Task.countDocuments({ ...match, status: { $in: completedStatuses } }),
    ]);

    totalTasks += projectTotal;
    completedTasks += projectCompleted;
  }

  return {
    ...portfolio.toObject(),
    projects,
    totalTasks,
    completedTasks,
    progress: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
  };
};

router.get('/', protect, async (req, res) => {
  try {
    const orgId = req.query.orgId || req.headers['x-active-org'];
    if (!orgId) return res.status(400).json({ message: 'Organization ID required' });

    await ensureMembership(req.user._id, orgId);
    const portfolios = await Portfolio.find({ organization: orgId })
      .populate('owner', 'name avatar')
      .sort({ updatedAt: -1 });

    const summaries = await Promise.all(portfolios.map(buildPortfolioSummary));
    res.json(summaries);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, description, orgId, projects, color, status } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });

    await ensureMembership(req.user._id, orgId);
    const portfolio = await Portfolio.create({
      name: name.trim(),
      description,
      organization: orgId,
      owner: req.user._id,
      projects: Array.isArray(projects) ? projects : [],
      color,
      status,
    });

    res.status(201).json(await buildPortfolioSummary(portfolio));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });

    await ensureMembership(req.user._id, portfolio.organization);
    const allowed = ['name', 'description', 'projects', 'color', 'status'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) portfolio[field] = req.body[field];
    }
    await portfolio.save();

    res.json(await buildPortfolioSummary(portfolio));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });

    await ensureMembership(req.user._id, portfolio.organization);
    await portfolio.deleteOne();
    res.json({ message: 'Portfolio deleted' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

module.exports = router;
