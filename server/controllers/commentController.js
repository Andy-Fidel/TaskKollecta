const Comment = require('../models/Comment');
const Task = require('../models/Task');
const { sendNotification } = require('../utils/notificationService');
const User = require('../models/User');

// @desc    Add a comment to a task
// @route   POST /api/comments
const addComment = async (req, res) => {
  const { content, taskId } = req.body;

  try {
    const comment = await Comment.create({
      content,
      task: taskId,
      user: req.user._id
    });

    // Populate user details immediately
    const fullComment = await Comment.findById(comment._id).populate('user', 'name avatar');


    const task = await Task.findById(taskId);

    // --- NOTIFICATION 1: ASSIGNEE ---
    // If the commenter is NOT the assignee, notify the assignee
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

    // --- NOTIFICATION 2: MENTIONS (@User) ---
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);

    if (mentions) {
        const uniqueNames = [...new Set(mentions.map(m => m.substring(1)))];
        
        for (const name of uniqueNames) {
            const mentionedUser = await User.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
                        if (mentionedUser && mentionedUser._id.toString() !== req.user._id.toString()) {
                
                // Send In-App Notification (Socket)
                await sendNotification(req.io, {
                    recipientId: mentionedUser._id,
                    senderId: req.user._id,
                    type: 'new_comment',
                    relatedId: taskId,
                    relatedModel: 'Task',
                    message: `mentioned you in a comment: "${content.substring(0, 20)}..."`
                });

                // Send Email Notification (Resend)
                await sendEmail({
                    email: mentionedUser.email,
                    subject: `${req.user.name} mentioned you in a comment`,
                    message: `
                        <p><strong>${req.user.name}</strong> mentioned you:</p>
                        <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; color: #555;">
                            "${content}"
                        </blockquote>
                        <br/>
                        <a href="${process.env.CLIENT_URL}/project/${task.project}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reply to Comment</a>
                    `
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


// @desc    Get comments for a task
// @route   GET /api/comments/:taskId
const getTaskComments = async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('user', 'name avatar')
      .sort({ createdAt: 1 }); 
    
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addComment, getTaskComments };