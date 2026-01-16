const Comment = require('../models/Comment');
const Task = require('../models/Task');
const User = require('../models/User');
const { sendNotification } = require('../utils/notificationService');
const sendEmail = require('../utils/sendEmail'); 

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

    const fullComment = await Comment.findById(comment._id).populate('user', 'name avatar');
    const task = await Task.findById(taskId);

    // --- NOTIFICATION 1: ASSIGNEE (Existing) ---
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
                    type: 'mention', // Specific type for icons
                    relatedId: taskId,
                    relatedModel: 'Task',
                    message: `mentioned you in a comment`
                });

                // 2. Email Notification
                await sendEmail({
                    email: mentionedUser.email,
                    subject: `${req.user.name} mentioned you`,
                    message: `
                        <p><strong>${req.user.name}</strong> mentioned you in a task:</p>
                        <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #333;">
                            "${content}"
                        </blockquote>
                        <a href="${process.env.CLIENT_URL}/project/${task.project}" style="display:inline-block; margin-top:10px; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reply</a>
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