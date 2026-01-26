const Comment = require('../models/Comment');
const Task = require('../models/Task');
const User = require('../models/User');
const Membership = require('../models/Membership');
const {
  sendNotification,
  sendCommentEmail,
  sendMentionEmail
} = require('../utils/notificationService');

// @desc    Add a comment to a task
// @route   POST /api/comments
const addComment = async (req, res) => {
  const { content, taskId } = req.body;

  try {
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // SECURITY: Verify user is a member of the task's organization
    const membership = await Membership.findOne({
      user: req.user._id,
      organization: task.organization
    });
    if (!membership) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comment = await Comment.create({
      content,
      task: taskId,
      user: req.user._id
    });

    const fullComment = await Comment.findById(comment._id).populate('user', 'name avatar');

    // --- NOTIFICATION 1: ASSIGNEE ---
    if (task && task.assignee && task.assignee.toString() !== req.user._id.toString()) {
      await sendNotification(req.io, {
        recipientId: task.assignee,
        senderId: req.user._id,
        type: 'new_comment',
        relatedId: taskId,
        relatedModel: 'Task',
        message: `commented on: ${task.title}`
      });

      // Send email notification
      await sendCommentEmail(task.assignee, {
        commenterName: req.user.name,
        task,
        projectId: task.project,
        comment: content
      });
    }

    // --- NOTIFICATION 2: MENTIONS (@User) ---
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);

    if (mentions) {
      // Remove '@' and get unique names
      const uniqueNames = [...new Set(mentions.map(m => m.substring(1)))];

      for (const name of uniqueNames) {
        // ✅ FIX: Changed regex to 'starts with' (^... not ^...$) 
        // This allows @John to match "John Doe"
        const mentionedUser = await User.findOne({
          name: { $regex: new RegExp(`^${name}`, "i") }
        });

        if (mentionedUser && mentionedUser._id.toString() !== req.user._id.toString()) {

          // 1. In-App Notification
          await sendNotification(req.io, {
            recipientId: mentionedUser._id,
            senderId: req.user._id,
            type: 'mention',
            relatedId: taskId,
            relatedModel: 'Task',
            message: `mentioned you in a comment`
          });

          // 2. Email Notification using template
          await sendMentionEmail(mentionedUser._id, {
            mentionerName: req.user.name,
            task,
            projectId: task.project,
            comment: content
          });
        }
      }
    }

    res.status(201).json(fullComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const before = req.query.before; // Cursor: createdAt timestamp of oldest loaded comment

    // Build query
    const query = { task: taskId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Get comments + 1 to check if there are more
    const comments = await Comment.find(query)
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 }) // Newest first for loading
      .limit(limit + 1);

    const hasMore = comments.length > limit;
    const data = hasMore ? comments.slice(0, limit) : comments;

    // Reverse to display oldest first in UI
    data.reverse();

    res.status(200).json({
      comments: data,
      hasMore,
      nextCursor: hasMore ? data[0]?.createdAt?.toISOString() : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addComment, getTaskComments };