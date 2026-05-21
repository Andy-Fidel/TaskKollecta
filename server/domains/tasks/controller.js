const Task = require('../../models/Task');
const Project = require('../../models/Project');
const taskService = require('./taskService');
const { handleDomainError } = require('../shared/errors');

const loadWritableTask = async (req) => {
  const task = await Task.findById(req.params.id);
  await taskService.requireTaskAccess(req.user._id, task, { write: true });
  return task;
};

const ensureWritableTasks = async (userId, taskIds) => {
  const tasks = await Task.find({ _id: { $in: taskIds } });
  if (tasks.length !== taskIds.length) {
    const error = new Error('One or more tasks were not found');
    error.status = 404;
    throw error;
  }
  for (const task of tasks) {
    await taskService.requireTaskAccess(userId, task, { write: true });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
const createTask = async (req, res) => {
  try {
    const task = await taskService.createTask({
      body: req.body,
      user: req.user,
      io: req.io,
    });
    res.status(201).json(task);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get all tasks for a project
// @route   GET /api/tasks/project/:projectId
const getProjectTasks = async (req, res) => {
  try {
    const tasks = await taskService.getProjectTasks({
      projectId: req.params.projectId,
      userId: req.user._id,
      query: req.query,
    });
    res.json(tasks);
  } catch (error) {
    handleDomainError(res, error);
  }
};


// @desc    Get all tasks assigned to current user (optionally filtered by organization)
// @route   GET /api/tasks/my-tasks?orgId=xxx
const getMyTasks = async (req, res) => {
  try {
    const { orgId } = req.query;
    
    // Build query - always filter by assignee
    const query = { assignee: req.user._id };
    
    // If orgId is provided, filter by organization
    if (orgId) {
      query.organization = orgId;
    }

    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar')
      .populate('project', 'name')
      .populate('dependencies', 'title status startDate dueDate')
      .populate('projectMemberships.project', 'name color')
      .sort({ dueDate: 1 });

    res.status(200).json(tasks);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/single/:id
const getTask = async (req, res) => {
  try {
    const task = await taskService.getTask({ taskId: req.params.id, userId: req.user._id });
    res.json(task);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const result = await taskService.deleteTask({
      taskId: req.params.id,
      user: req.user,
      io: req.io,
    });
    res.json(result);
  } catch (error) {
    console.error("Delete Error:", error);
    handleDomainError(res, error);
  }
};

// @desc    Add attachment to task
// @route   POST /api/tasks/:id/attachments
const addAttachment = async (req, res) => {
  try {
    const { url, filename, type } = req.body;
    
    // Validate required fields
    if (!url || !filename) {
      return res.status(400).json({ message: 'URL and filename are required' });
    }

    // Explicitly construct the attachment object to avoid any string casting issues
    const attachment = {
      url: String(url),
      filename: String(filename),
      type: String(type || 'file'),
      uploadedAt: new Date()
    };

    await loadWritableTask(req);
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { attachments: attachment } },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('addAttachment error:', error);
    handleDomainError(res, error);
  }
};


// --- SUBTASK LOGIC ---

// @desc Add subtask
// @route POST /api/tasks/:id/subtasks
const addSubtask = async (req, res) => {
  try {
    await loadWritableTask(req);
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { subtasks: { title: req.body.title, isCompleted: false } } },
      { new: true }
    );
    res.json(task);
  } catch (error) { handleDomainError(res, error); }
};

// @desc Toggle subtask
// @route PUT /api/tasks/:id/subtasks/:subtaskId
const toggleSubtask = async (req, res) => {
  try {
    const task = await loadWritableTask(req);
    const subtask = task.subtasks.id(req.params.subtaskId);
    subtask.isCompleted = !subtask.isCompleted;
    await task.save();
    res.json(task);
  } catch (error) { handleDomainError(res, error); }
};

// @desc Delete subtask
// @route DELETE /api/tasks/:id/subtasks/:subtaskId
const deleteSubtask = async (req, res) => {
  try {
    const task = await loadWritableTask(req);
    task.subtasks.pull(req.params.subtaskId);
    await task.save();
    res.json(task);
  } catch (error) { handleDomainError(res, error); }
};

// --- DEPENDENCY LOGIC ---

// @desc Add dependency (Blocker)
// @route POST /api/tasks/:id/dependencies
const addDependency = async (req, res) => {
  const { dependencyId } = req.body;
  try {
    if (req.params.id === dependencyId) return res.status(400).json({ message: "Task cannot block itself" });

    await loadWritableTask(req);
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { dependencies: dependencyId } },
      { new: true }
    ).populate('dependencies', 'title status startDate dueDate');

    res.json(task);
  } catch (error) { handleDomainError(res, error); }
};

// @desc Remove dependency
// @route DELETE /api/tasks/:id/dependencies/:dependencyId
const removeDependency = async (req, res) => {
  try {
    await loadWritableTask(req);
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $pull: { dependencies: req.params.dependencyId } },
      { new: true }
    ).populate('dependencies', 'title status startDate dueDate');
    res.json(task);
  } catch (error) { handleDomainError(res, error); }
};

const updateTask = async (req, res) => {
  try {
    const updatedTask = await taskService.updateTask({
      taskId: req.params.id,
      body: req.body,
      user: req.user,
      io: req.io,
    });
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error(error);
    handleDomainError(res, error);
  }
};

// @desc    Toggle archive status
// @route   PUT /api/tasks/:id/archive
const toggleArchiveTask = async (req, res) => {
  try {
    const task = await loadWritableTask(req);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.archived = !task.archived; // Toggle
    await task.save();

    res.json(task);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// --- TAG LOGIC ---

// @desc Add tag to task
// @route POST /api/tasks/:id/tags
const addTag = async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ message: 'Tag name is required' });

    const task = await loadWritableTask(req);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Check if tag already exists
    const existingTag = task.tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existingTag) return res.status(400).json({ message: 'Tag already exists' });

    task.tags.push({ name, color: color || '#6366f1' });
    await task.save();

    res.json(task);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc Remove tag from task
// @route DELETE /api/tasks/:id/tags/:tagId
const removeTag = async (req, res) => {
  try {
    const task = await loadWritableTask(req);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.tags.pull(req.params.tagId);
    await task.save();

    res.json(task);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// --- RECURRENCE LOGIC ---

// @desc Set recurrence for a task
// @route PUT /api/tasks/:id/recurrence
const setRecurrence = async (req, res) => {
  try {
    const { enabled, pattern, interval, daysOfWeek, endDate } = req.body;

    await loadWritableTask(req);
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        recurrence: {
          enabled: enabled !== false,
          pattern: pattern || 'weekly',
          interval: interval || 1,
          daysOfWeek: daysOfWeek || [],
          endDate: endDate || null,
          lastGenerated: null
        }
      },
      { new: true }
    ).populate('assignee', 'name email avatar')
      .populate('project', 'name');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json(task);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc Remove recurrence from a task
// @route DELETE /api/tasks/:id/recurrence
const removeRecurrence = async (req, res) => {
  try {
    await loadWritableTask(req);
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        recurrence: {
          enabled: false,
          pattern: 'weekly',
          interval: 1,
          daysOfWeek: [],
          endDate: null,
          lastGenerated: null
        }
      },
      { new: true }
    ).populate('assignee', 'name email avatar')
      .populate('project', 'name');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json(task);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Delete attachment from task
// @route   DELETE /api/tasks/:id/attachments/:attachmentId
const deleteAttachment = async (req, res) => {
  try {
    await loadWritableTask(req);
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $pull: { attachments: { _id: req.params.attachmentId } } },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('deleteAttachment error:', error);
    handleDomainError(res, error);
  }
};

// @desc    Bulk update tasks
// @route   PUT /api/tasks/bulk
const bulkUpdateTasks = async (req, res) => {
  try {
    const { taskIds, updates } = req.body;
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds array is required' });
    }

    const allowedFields = ['status', 'priority', 'assignee', 'startDate', 'dueDate', 'customFieldValues'];
    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid update fields provided' });
    }

    await ensureWritableTasks(req.user._id, taskIds);
    await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: updateData }
    );

    const updatedTasks = await Task.find({ _id: { $in: taskIds } })
      .populate('assignee', 'name avatar')
      .populate('dependencies', 'title status startDate dueDate');

    res.status(200).json(updatedTasks);
  } catch (error) {
    console.error(error);
    handleDomainError(res, error);
  }
};

// @desc    Bulk delete tasks
// @route   DELETE /api/tasks/bulk
const bulkDeleteTasks = async (req, res) => {
  try {
    const { taskIds } = req.body;
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds array is required' });
    }

    await ensureWritableTasks(req.user._id, taskIds);
    await Task.deleteMany({ _id: { $in: taskIds } });
    res.status(200).json({ message: `${taskIds.length} tasks deleted` });
  } catch (error) {
    console.error(error);
    handleDomainError(res, error);
  }
};

// @desc    Create a sub-task (real Task document linked to parent)
// @route   POST /api/tasks/:id/children
const createChildTask = async (req, res) => {
  try {
    const parentTask = await loadWritableTask(req);
    if (!parentTask) return res.status(404).json({ message: 'Parent task not found' });

    const { title, description, priority, assignee, dueDate } = req.body;
    const child = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      assignee: assignee || null,
      dueDate: dueDate || null,
      project: parentTask.project,
      organization: parentTask.organization,
      reporter: req.user._id,
      parentTask: parentTask._id,
      parentType: 'subtask',
    });

    const populated = await child.populate('assignee', 'name avatar email');
    res.status(201).json(populated);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get child sub-tasks for a task
// @route   GET /api/tasks/:id/children
const getChildTasks = async (req, res) => {
  try {
    const children = await Task.find({ parentTask: req.params.id, parentType: 'subtask' })
      .populate('assignee', 'name avatar email')
      .sort({ createdAt: -1 });
    res.json(children);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc Add an existing task to another project
// @route POST /api/tasks/:id/projects
const addTaskToProject = async (req, res) => {
  try {
    const task = await loadWritableTask(req);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await Project.findById(req.body.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.organization.toString() !== task.organization.toString()) {
      return res.status(400).json({ message: 'Project must be in the same organization' });
    }

    task.projectMemberships = task.projectMemberships || [];
    if (!task.projectMemberships.some((membership) => membership.project.toString() === task.project.toString())) {
      task.projectMemberships.push({ project: task.project });
    }
    if (!task.projectMemberships.some((membership) => membership.project.toString() === project._id.toString())) {
      task.projectMemberships.push({ project: project._id });
      await task.save();
    }

    const updated = await Task.findById(task._id)
      .populate('assignee', 'name avatar')
      .populate('project', 'name')
      .populate('projectMemberships.project', 'name color');
    res.json(updated);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc Remove a task from a secondary project
// @route DELETE /api/tasks/:id/projects/:projectId
const removeTaskFromProject = async (req, res) => {
  try {
    const task = await loadWritableTask(req);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.project.toString() === req.params.projectId) {
      return res.status(400).json({ message: 'Cannot remove the primary project from a task' });
    }

    task.projectMemberships = (task.projectMemberships || []).filter(
      (membership) => membership.project.toString() !== req.params.projectId
    );
    await task.save();

    const updated = await Task.findById(task._id)
      .populate('assignee', 'name avatar')
      .populate('project', 'name')
      .populate('projectMemberships.project', 'name color');
    res.json(updated);
  } catch (error) {
    handleDomainError(res, error);
  }
};

module.exports = {
  createTask, getProjectTasks, getTask,
  getMyTasks, deleteTask, addAttachment, deleteAttachment,
  addSubtask, toggleSubtask,
  addDependency, removeDependency, updateTask, deleteSubtask, toggleArchiveTask,
  addTag, removeTag, setRecurrence, removeRecurrence,
  bulkUpdateTasks, bulkDeleteTasks,
  createChildTask, getChildTasks,
  addTaskToProject, removeTaskFromProject
};
