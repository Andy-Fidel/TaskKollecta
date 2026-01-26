const Task = require('../models/Task');
const User = require('../models/User');
const {
  sendNotification,
  sendTaskAssignmentEmail,
  sendStatusChangeEmail
} = require('../utils/notificationService');
const { logActivity } = require('../utils/activityLogger');
const runAutomations = require('../utils/automationEngine');

// @desc    Create new task
// @route   POST /api/tasks
const createTask = async (req, res) => {
  const { title, description, status, priority, dueDate, projectId, orgId, assignee } = req.body;

  try {
    const task = await Task.create({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate,
      project: projectId,
      organization: orgId,
      assignee,
      reporter: req.user._id
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignee', 'name email avatar')
      .populate('project', 'name');

    // ✅ LOG ACTIVITY HERE
    await logActivity(req, {
      task: task,
      action: 'created',
      details: `created the task "${task.title}"`
    });

    // Send email notification for assignment
    if (assignee && assignee !== req.user._id.toString()) {
      await sendTaskAssignmentEmail(assignee, {
        assignerName: req.user.name,
        task: populatedTask,
        projectName: populatedTask.project?.name,
        projectId
      });
    }

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all tasks for a project
// @route   GET /api/tasks/project/:projectId
const getProjectTasks = async (req, res) => {
  try {
    // Check if client specifically asked for archived tasks
    const showArchived = req.query.archived === 'true';

    const query = {
      project: req.params.projectId,

      archived: showArchived ? true : { $ne: true }
    };

    const tasks = await Task.find(query)
      .populate('assignee', 'name avatar')
      .populate('dependencies', 'title status')
      .sort({ index: 1 });

    res.json(tasks);
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

// @desc    Get single task
// @route   GET /api/tasks/single/:id
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name avatar')
      .populate('dependencies', 'title status');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    // SECURITY: Verify user is a member of the task's organization
    const membership = await Membership.findOne({
      user: req.user._id,
      organization: task.organization
    });
    if (!membership) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
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

    // Log deletion 
    await logActivity(req, { task, action: 'deleted', details: 'Task removed permanently' });

    await Task.deleteOne({ _id: req.params.id });

    res.json({ id: req.params.id, message: 'Task removed' });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add attachment to task
// @route   POST /api/tasks/:id/attachments
const addAttachment = async (req, res) => {
  try {
    const { url, filename, type } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { attachments: { url, filename, type } } },
      { new: true }
    );
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// --- SUBTASK LOGIC ---

// @desc Add subtask
// @route POST /api/tasks/:id/subtasks
const addSubtask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { subtasks: { title: req.body.title, isCompleted: false } } },
      { new: true }
    );
    res.json(task);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc Toggle subtask
// @route PUT /api/tasks/:id/subtasks/:subtaskId
const toggleSubtask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const subtask = task.subtasks.id(req.params.subtaskId);
    subtask.isCompleted = !subtask.isCompleted;
    await task.save();
    res.json(task);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc Delete subtask
// @route DELETE /api/tasks/:id/subtasks/:subtaskId
const deleteSubtask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    task.subtasks.pull(req.params.subtaskId);
    await task.save();
    res.json(task);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- DEPENDENCY LOGIC ---

// @desc Add dependency (Blocker)
// @route POST /api/tasks/:id/dependencies
const addDependency = async (req, res) => {
  const { dependencyId } = req.body;
  try {
    if (req.params.id === dependencyId) return res.status(400).json({ message: "Task cannot block itself" });

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { dependencies: dependencyId } },
      { new: true }
    ).populate('dependencies', 'title status');

    res.json(task);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc Remove dependency
// @route DELETE /api/tasks/:id/dependencies/:dependencyId
const removeDependency = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $pull: { dependencies: req.params.dependencyId } },
      { new: true }
    ).populate('dependencies', 'title status');
    res.json(task);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateTask = async (req, res) => {
  try {
    const oldTask = await Task.findById(req.params.id).populate('dependencies');

    if (!oldTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // BLOCKING LOGIC: Check dependencies if marking as done
    if (req.body.status === 'done' && oldTask.dependencies.length > 0) {
      const incompleteDependencies = oldTask.dependencies.filter(dep => dep.status !== 'done');

      if (incompleteDependencies.length > 0) {
        const titles = incompleteDependencies.map(t => t.title).join(', ');
        return res.status(400).json({
          message: `Cannot complete task. It is waiting on: ${titles}`
        });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate('dependencies', 'title status')
      .populate('assignee', 'name avatar');

    // ✅ LOG ACTIVITY: Check if status changed
    if (req.body.status && oldTask.status !== req.body.status) {
      await logActivity(req, {
        task: updatedTask,
        action: 'moved',
        details: `moved "${updatedTask.title}" to ${req.body.status}`
      });
    }

    // --- AUTOMATION TRIGGER ---
    if (req.body.status) {
      runAutomations(updatedTask.project, 'status_change', req.body.status, updatedTask);
    }

    if (req.body.priority) {
      runAutomations(updatedTask.project, 'priority_change', req.body.priority, updatedTask);
    }

    // NOTIFICATIONS (Socket + Email)
    if (req.body.assignee && req.body.assignee !== oldTask.assignee?.toString()) {
      if (req.body.assignee !== req.user._id.toString()) {
        await sendNotification(req.io, {
          recipientId: req.body.assignee,
          senderId: req.user._id,
          type: 'task_assigned',
          relatedId: updatedTask._id,
          relatedModel: 'Task',
          message: `assigned you to task: ${updatedTask.title}`
        });

        // Send email using new template system
        await sendTaskAssignmentEmail(req.body.assignee, {
          assignerName: req.user.name,
          task: updatedTask,
          projectName: updatedTask.project?.name || 'General',
          projectId: updatedTask.project
        });
      }
    }

    // Send status change email to assignee
    if (req.body.status && oldTask.status !== req.body.status && updatedTask.assignee) {
      const assigneeId = updatedTask.assignee._id || updatedTask.assignee;
      if (assigneeId.toString() !== req.user._id.toString()) {
        await sendStatusChangeEmail(assigneeId, {
          changerName: req.user.name,
          task: updatedTask,
          projectId: updatedTask.project,
          oldStatus: oldTask.status,
          newStatus: req.body.status
        });
      }
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle archive status
// @route   PUT /api/tasks/:id/archive
const toggleArchiveTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.archived = !task.archived; // Toggle
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- TAG LOGIC ---

// @desc Add tag to task
// @route POST /api/tasks/:id/tags
const addTag = async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ message: 'Tag name is required' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Check if tag already exists
    const existingTag = task.tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existingTag) return res.status(400).json({ message: 'Tag already exists' });

    task.tags.push({ name, color: color || '#6366f1' });
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Remove tag from task
// @route DELETE /api/tasks/:id/tags/:tagId
const removeTag = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.tags.pull(req.params.tagId);
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- RECURRENCE LOGIC ---

// @desc Set recurrence for a task
// @route PUT /api/tasks/:id/recurrence
const setRecurrence = async (req, res) => {
  try {
    const { enabled, pattern, interval, daysOfWeek, endDate } = req.body;

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
    res.status(500).json({ message: error.message });
  }
};

// @desc Remove recurrence from a task
// @route DELETE /api/tasks/:id/recurrence
const removeRecurrence = async (req, res) => {
  try {
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
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTask, getProjectTasks, getTask,
  getMyTasks, deleteTask, addAttachment,
  addSubtask, toggleSubtask,
  addDependency, removeDependency, updateTask, deleteSubtask, toggleArchiveTask,
  addTag, removeTag, setRecurrence, removeRecurrence
};