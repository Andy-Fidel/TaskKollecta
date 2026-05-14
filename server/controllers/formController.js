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
    const project = await Project.findById(form.project);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const projectCustomFieldMap = new Map((project.customFields || []).map((field) => [field.key, field]));

    
    let formattedDescription = `**Form Submission: ${form.title}**\n\n`;
    const customFieldValues = [];
    
    form.fields.forEach(field => {
      const answer = responses[field.id] || '(No answer)';
      const displayAnswer = Array.isArray(answer) ? answer.join(', ') : answer;
      formattedDescription += `**${field.label}**: ${displayAnswer}\n\n`;

      if (field.customFieldKey && responses[field.id] !== undefined && responses[field.id] !== '') {
        const projectCustomField = projectCustomFieldMap.get(field.customFieldKey);
        let value = responses[field.id];
        if (projectCustomField?.type === 'checkbox') {
          value = Array.isArray(value) ? value.length > 0 : Boolean(value);
        } else if (projectCustomField?.type === 'number') {
          value = Number(value);
        }
        customFieldValues.push({
          key: field.customFieldKey,
          value,
        });
      }
    });

    
    const titleField = form.fields.find(f => f.type === 'text');
    const taskTitle = titleField ? responses[titleField.id] : `Submission: ${form.title}`;


    const newTask = await Task.create({
      title: taskTitle,
      description: formattedDescription,
      project: form.project,
      projectMemberships: [{ project: form.project }],
      organization: project.organization,
      reporter: form.createdBy,
      status: project.workflowStatuses?.[0]?.id || 'todo',
      priority: 'medium',
      customFieldValues
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
