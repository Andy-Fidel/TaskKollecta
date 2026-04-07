const commentService = require('./commentService');
const { handleDomainError } = require('../shared/errors');

// @desc    Add a comment to a task
// @route   POST /api/comments
const addComment = async (req, res) => {
  try {
    const { comment, notify } = await commentService.addComment({
      content: req.body.content,
      taskId: req.body.taskId,
      user: req.user,
      io: req.io,
    });

    // Send the response FIRST, then handle notifications
    res.status(201).json(comment);

    // --- BACKGROUND: NOTIFICATIONS (failures must NOT affect the comment) ---
    try {
      await notify();
    } catch (notifError) {
      console.warn('Comment saved but notification failed:', notifError.message);
    }

  } catch (error) {
    console.error(error);
    handleDomainError(res, error);
  }
};

const getTaskComments = async (req, res) => {
  try {
    const result = await commentService.getTaskComments({
      taskId: req.params.taskId,
      limit: parseInt(req.query.limit, 10) || 20,
      before: req.query.before,
    });
    res.status(200).json(result);
  } catch (error) {
    handleDomainError(res, error);
  }
};

module.exports = { addComment, getTaskComments };
