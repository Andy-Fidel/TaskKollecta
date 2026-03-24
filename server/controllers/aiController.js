const { 
  generateTaskBreakdown, 
  generateTaskDescription,
  generateDailyDigest,
  generateSmartFocus,
  suggestTaskPriority,
  suggestTaskEffort,
  generateSubtasks,
  generateProjectHealthSnapshot,
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
 * GET /api/ai/focus
 * Generate smart focus recommendations (3-5 most important tasks for today/tomorrow).
 */
const getSmartFocus = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    // Fetch user's incomplete tasks due within the next 2 days
    const tasks = await Task.find({ 
      assignee: req.user._id,
      status: { $ne: 'done' },
      dueDate: { $gte: today, $lt: dayAfterTomorrow }
    }).select('_id title priority dueDate').lean();

    // If no tasks due soon, get the next incomplete tasks
    if (tasks.length === 0) {
      const upcoming = await Task.find({
        assignee: req.user._id,
        status: { $ne: 'done' }
      }).select('_id title priority dueDate').sort({ dueDate: 1 }).limit(5).lean();
      
      if (upcoming.length === 0) {
        return res.json({ focusTasks: [] });
      }
      
      const upcomingJson = JSON.stringify(upcoming);
      const focus = await generateSmartFocus(upcomingJson);
      return res.json({ focusTasks: focus });
    }

    const tasksJson = JSON.stringify(tasks);
    const focusTasks = await generateSmartFocus(tasksJson);
    
    res.json({ focusTasks });
  } catch (error) {
    console.error('AI smart focus error:', error.message);
    res.status(500).json({ message: 'Failed to generate focus recommendations.' });
  }
};

/**
 * POST /api/ai/suggest-priority
 * Suggest priority level for a task based on title.
 * Body: { title: string }
 */
const getSuggestedPriority = async (req, res) => {
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Task title is required' });
  }

  try {
    const priority = await suggestTaskPriority(title.trim());
    res.json({ priority });
  } catch (error) {
    console.error('AI priority suggestion error:', error.message);
    res.status(500).json({ message: 'Failed to suggest priority.' });
  }
};

/**
 * POST /api/ai/suggest-effort
 * Suggest effort estimate for a task.
 * Body: { title: string, description?: string }
 */
const getSuggestedEffort = async (req, res) => {
  const { title, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Task title is required' });
  }

  try {
    const effort = await suggestTaskEffort(title.trim(), description?.trim());
    res.json({ effort });
  } catch (error) {
    console.error('AI effort suggestion error:', error.message);
    res.status(500).json({ message: 'Failed to suggest effort.' });
  }
};

/**
 * POST /api/ai/generate-subtasks
 * Generate subtasks for a task.
 * Body: { title: string, description?: string }
 */
const getGeneratedSubtasks = async (req, res) => {
  const { title, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Task title is required' });
  }

  try {
    const subtasks = await generateSubtasks(title.trim(), description?.trim());
    res.json({ subtasks });
  } catch (error) {
    console.error('AI subtask generation error:', error.message);
    res.status(500).json({ message: 'Failed to generate subtasks.' });
  }
};

/**
 * GET /api/ai/projects/:projectId/health
 * Generate a quick project health snapshot.
 */
const getProjectHealthSnapshot = async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Fetch all tasks for the project
    const allTasks = await Task.find({ project: projectId }).select('status dueDate createdAt').lean();
    
    if (allTasks.length === 0) {
      return res.json({ 
        healthSnapshot: '🎯 New project! No tasks created yet.',
        stats: {
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          dueSoonTasks: 0,
          weeklyCompletionRate: 0
        }
      });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Calculate stats
    const completedTasks = allTasks.filter(t => t.status === 'done').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length;
    const overdueTasks = allTasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'done').length;
    const dueSoonTasks = allTasks.filter(t => 
      t.dueDate && 
      t.dueDate >= now && 
      t.dueDate <= threeDaysFromNow && 
      t.status !== 'done'
    ).length;
    
    // Weekly completion rate: tasks completed in last 7 days / tasks completed or created in last 7 days
    const tasksCompletedThisWeek = allTasks.filter(t => t.status === 'done' && t.updatedAt && new Date(t.updatedAt) >= weekAgo).length;
    const tasksCreatedThisWeek = allTasks.filter(t => new Date(t.createdAt) >= weekAgo).length;
    const weeklyCompletionRate = tasksCreatedThisWeek > 0 
      ? Math.round((tasksCompletedThisWeek / tasksCreatedThisWeek) * 100) 
      : 0;

    const stats = {
      totalTasks: allTasks.length,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      dueSoonTasks,
      weeklyCompletionRate
    };

    // Generate AI snapshot
    const healthSnapshot = await generateProjectHealthSnapshot(stats);
    
    res.json({ healthSnapshot, stats });
  } catch (error) {
    console.error('AI health snapshot error:', error.message);
    res.status(500).json({ message: 'Failed to generate health snapshot.' });
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
  getSmartFocus,
  getSuggestedPriority,
  getSuggestedEffort,
  getGeneratedSubtasks,
  getProjectHealthSnapshot,
  getProjectRisks
};
