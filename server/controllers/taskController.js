const Task = require('../models/Task');
const { sendNotification } = require('../utils/notificationService');
const { logActivity } = require('../utils/activityLogger');

// @desc    Create a new task
// @route   POST /api/tasks
const createTask = async (req, res) => {
  const { title, description, projectId, orgId, status, priority, assignee } = req.body;

  try {
    const task = await Task.create({
      title,
      description,
      project: projectId,
      organization: orgId, 
      reporter: req.user._id,
      assignee: assignee || null, 
      status: status || 'todo',
      priority: priority || 'medium'
    });

    // --- NOTIFICATION LOGIC START ---
    // We check if an assignee exists AND it is not the person creating the task
    if (assignee && assignee !== req.user._id.toString()) {
        await sendNotification(req.io, {
            recipientId: assignee,
            senderId: req.user._id,
            type: 'task_assigned',
            relatedId: task._id, 
            relatedModel: 'Task',
            message: `assigned you to task: ${task.title}`
        });
    }
    // --- NOTIFICATION LOGIC END ---

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  await logActivity(req, { task, action: 'created', details: 'created this task' });
};

// @desc    Get all tasks for a project
// @route   GET /api/tasks/project/:projectId
const getProjectTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignee', 'name avatar') 
      .sort({ createdAt: -1 }); 

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update task status (Move to another column) or Assignee
// @route   PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const oldTask = await Task.findById(req.params.id);

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (req.body.status && oldTask.status !== req.body.status) {
       await logActivity(req, { 
         task: updatedTask, 
         action: 'updated_status', 
         details: `from ${oldTask.status} to ${req.body.status}` 
       });
    }

    // Priority Change
    if (req.body.priority && oldTask.priority !== req.body.priority) {
       await logActivity(req, { 
         task: updatedTask, 
         action: 'updated_priority', 
         details: `to ${req.body.priority}` 
       });
    }

    // Assignee Change
    if (req.body.assignee && oldTask.assignee?.toString() !== req.body.assignee) {
       // We might want to fetch the assignee name for the log, but ID is okay for now
       await logActivity(req, { 
         task: updatedTask, 
         action: 'assigned', 
         details: 'changed assignee' 
       });
    }

    // --- NOTIFICATION LOGIC START ---
    // Check if assignee was part of THIS update
    if (req.body.assignee && req.body.assignee !== req.user._id.toString()) {
        await sendNotification(req.io, {
            recipientId: req.body.assignee,
            senderId: req.user._id,
            type: 'task_assigned',
            relatedId: task._id, // FIX: Use 'task', not 'updatedTask'
            relatedModel: 'Task',
            message: `assigned you to task: ${task.title}`
        });
    }
    // --- NOTIFICATION LOGIC END ---

    res.status(200).json(updateTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all tasks assigned to current user across all projects
// @route   GET /api/tasks/my-tasks
const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignee: req.user._id })
      .populate('project', 'name') 
      .sort({ dueDate: 1 }); 
      
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Optional: Check permissions (e.g., only creator or admin can delete)
    // if (task.reporter.toString() !== req.user._id.toString()) ...

    await task.deleteOne();
    res.json({ id: req.params.id, message: 'Task removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTask, getProjectTasks, updateTask, getMyTasks, deleteTask };