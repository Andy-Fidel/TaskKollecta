const Form = require('../models/Form');
const Task = require('../models/Task');
const Project = require('../models/Project');

// @desc    Create a new intake form
// @route   POST /api/forms
const createForm = async (req, res) => {
  try {
    const { title, description, projectId, fields } = req.body;
    
    const form = await Form.create({
      title,
      description,
      project: projectId,
      createdBy: req.user._id,
      fields
    });
    
    res.status(201).json(form);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get form by ID (Public Access)
// @route   GET /api/forms/:id
const getForm = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form || !form.isActive) {
      return res.status(404).json({ message: 'Form not found or inactive' });
    }
    res.json(form);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit a form response -> Creates a Task
// @route   POST /api/forms/:id/submit
const submitForm = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: 'Form not found' });

    const responses = req.body; 

    
    let formattedDescription = `**Form Submission: ${form.title}**\n\n`;
    
    form.fields.forEach(field => {
      const answer = responses[field.id] || '(No answer)';
      formattedDescription += `**${field.label}**: ${answer}\n\n`;
    });

    
    const titleField = form.fields.find(f => f.type === 'text');
    const taskTitle = titleField ? responses[titleField.id] : `Submission: ${form.title}`;


    const newTask = await Task.create({
      title: taskTitle,
      description: formattedDescription,
      project: form.project,
      organization: (await Project.findById(form.project)).organization,
      reporter: form.createdBy,
      status: 'todo',
      priority: 'medium'
    });

    res.status(201).json({ message: 'Submission successful', taskId: newTask._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all forms for a project
// @route   GET /api/forms/project/:projectId
const getProjectForms = async (req, res) => {
    try {
        const forms = await Form.find({ project: req.params.projectId });
        res.json(forms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = { createForm, getForm, submitForm, getProjectForms };