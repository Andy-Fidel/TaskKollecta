const Comment = require('../models/Comment');
const Task = require('../models/Task');
const { sendNotification } = require('../utils/notificationService');

// @desc    Add a comment to a task
// @route   POST /api/comments
const addComment = async (req, res) => {
  const { content, taskId } = req.body;

  try {
    // 1. Create Comment
    const comment = await Comment.create({
      content,
      task: taskId,
      user: req.user._id
    });

    // 2. Populate user details immediately
    const fullComment = await Comment.findById(comment._id).populate('user', 'name avatar');

    // 3. Notification Logic
    // We need to fetch the task to find out who is assigned to it
    const task = await Task.findById(taskId);

    // Only notify if:
    // a. Task exists
    // b. Task has an assignee
    // c. The person commenting is NOT the assignee (don't notify yourself)
    if (task && task.assignee && task.assignee.toString() !== req.user._id.toString()) {
        await sendNotification(req.io, {
            recipientId: task.assignee,
            senderId: req.user._id,
            type: 'new_comment',
            relatedId: taskId,
            relatedModel: 'Task',
            message: `commented on: ${task.title}`
        });
    }

    res.status(201).json(fullComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


// @desc    Get comments for a task
// @route   GET /api/comments/:taskId
const getTaskComments = async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('user', 'name avatar')
      .sort({ createdAt: 1 }); // Oldest first (like a chat)
    
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addComment, getTaskComments };