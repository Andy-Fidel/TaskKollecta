const { generateTaskBreakdown, generateTaskDescription } = require('../utils/aiService');

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

module.exports = { getTaskBreakdown, getTaskDescription };
