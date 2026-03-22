const { 
  generateTaskBreakdown, 
  generateTaskDescription,
  generateDailyDigest,
  analyzeProjectRisks
} = require('../utils/aiService');
const Task = require('../models/Task');
const Project = require('../models/Project');

/**
 * POST /api/ai/breakdown
 * Generate a task breakdown for a new project.
 * Body: { name: string, description?: string }
 */
const getTaskBreakdown = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  try {
    const tasks = await generateTaskBreakdown(name.trim(), description?.trim());
    res.json({ tasks });
  } catch (error) {
    console.error('AI breakdown error:', error.message);
    res.status(500).json({ message: 'Failed to generate task breakdown. Please try again.' });
  }
};

/**
 * POST /api/ai/describe
 * Generate a detailed description for a task.
 * Body: { title: string, projectName?: string }
 */
const getTaskDescription = async (req, res) => {
  const { title, projectName } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Task title is required' });
  }

  try {
    const result = await generateTaskDescription(title.trim(), projectName?.trim());
    res.json(result);
  } catch (error) {
    console.error('AI describe error:', error.message);
    res.status(500).json({ message: 'Failed to generate description. Please try again.' });
  }
};

/**
 * GET /api/ai/digest
 * Generate a personalized daily digest for the current user.
 */
const getDailyDigest = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Fetch user's tasks
    const tasks = await Task.find({ 
      assignee: req.user._id,
      $or: [
        { status: { $ne: 'done' } }, // incomplete tasks
        { status: 'done', updatedAt: { $gte: new Date(today.getTime() - 24 * 60 * 60 * 1000) } } // recently completed
      ]
    }).select('title status priority dueDate');

    const tasksJson = JSON.stringify(tasks);
    const digest = await generateDailyDigest(req.user.name.split(' ')[0], tasksJson);
    
    res.json({ digest });
  } catch (error) {
    console.error('AI digest error:', error.message);
    res.status(500).json({ message: 'Failed to generate daily digest.' });
  }
};

/**
 * GET /api/ai/projects/:projectId/risks
 * Analyze incomplete tasks for a specific project to identify risks.
 */
const getProjectRisks = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Fetch incomplete tasks for the project
    const tasks = await Task.find({ 
      project: projectId, 
      status: { $ne: 'done' } 
    }).populate('assignee', 'name').select('title status priority dueDate description assignee');

    if (tasks.length === 0) {
      return res.json({ risks: [] }); // No incomplete tasks = no risk
    }

    const tasksJson = JSON.stringify(tasks.map(t => ({
      _id: t._id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      hasDescription: !!t.description,
      assignee: t.assignee ? t.assignee.name : 'Unassigned'
    })));

    const risks = await analyzeProjectRisks(project.name, tasksJson);
    res.json({ risks });
  } catch (error) {
    console.error('AI risk analysis error:', error.message);
    res.status(500).json({ message: 'Failed to analyze project risks.' });
  }
};

module.exports = { 
  getTaskBreakdown, 
  getTaskDescription,
  getDailyDigest,
  getProjectRisks
};
