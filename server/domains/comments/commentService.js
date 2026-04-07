const Comment = require('../../models/Comment');
const Task = require('../../models/Task');
const { createDomainError } = require('../shared/errors');
const { ensureMembership } = require('../shared/access');
const { notifyCommentCreated } = require('./commentSideEffects');

const addComment = async ({ content, taskId, user, io }) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw createDomainError(404, 'Task not found');
  }

  await ensureMembership(user._id, task.organization);

  const comment = await Comment.create({
    content,
    task: taskId,
    user: user._id,
  });

  const fullComment = await Comment.findById(comment._id).populate('user', 'name avatar');

  const notify = async () => {
    await notifyCommentCreated({ io, task, taskId, user, content });
  };

  return { comment: fullComment, notify };
};

const getTaskComments = async ({ taskId, limit, before }) => {
  const query = { task: taskId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const comments = await Comment.find(query)
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(limit + 1);

  const hasMore = comments.length > limit;
  const data = hasMore ? comments.slice(0, limit) : comments;
  data.reverse();

  return {
    comments: data,
    hasMore,
    nextCursor: hasMore ? data[0]?.createdAt?.toISOString() : null,
  };
};

module.exports = {
  addComment,
  getTaskComments,
};
