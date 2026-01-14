const Task = require('../models/Task');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
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

    // Optional: Log the deletion before destroying the record
    // (Ensure logActivity is imported at the top if you use this)
    // await logActivity(req, { task, action: 'deleted', details: 'Task removed permanently' });

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
    // Fetch the CURRENT state (Before update)
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

    // PERFORM UPDATE
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    )
    .populate('dependencies', 'title status')
    .populate('assignee', 'name avatar');

    // NOTIFICATIONS (Socket + Email)
    // Check if assignee exists in body AND if it is DIFFERENT from before
    if (req.body.assignee && req.body.assignee !== oldTask.assignee?.toString()) {
        
        // Send Socket Notification
        if (req.body.assignee !== req.user._id.toString()) {
            await sendNotification(req.io, {
                recipientId: req.body.assignee,
                senderId: req.user._id,
                type: 'task_assigned',
                relatedId: updatedTask._id, 
                relatedModel: 'Task',
                message: `assigned you to task: ${updatedTask.title}`
            });
        }

        // B. Send Email Notification
        const assigneeUser = await User.findById(req.body.assignee);
        
        if (assigneeUser) {
            await sendEmail({
                email: assigneeUser.email,
                subject: `You were assigned to: ${updatedTask.title}`,
                message: `
                    <h2>New Task Assignment</h2>
                    <p><strong>${req.user.name}</strong> assigned you to a task.</p>
                    <div style="padding: 15px; border: 1px solid #eee; border-radius: 5px; margin: 10px 0;">
                        <h3>${updatedTask.title}</h3>
                        <p>Priority: ${updatedTask.priority}</p>
                    </div>
                    <a href="${process.env.CLIENT_URL}/project/${updatedTask.project}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>
                `
            });
        }
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTask, getProjectTasks, 
  getMyTasks, deleteTask, addAttachment, 
  addSubtask, toggleSubtask, 
  addDependency, removeDependency, updateTask, deleteSubtask };