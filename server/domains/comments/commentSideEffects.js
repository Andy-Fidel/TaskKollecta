const User = require('../../models/User');
const {
  sendNotification,
  sendCommentEmail,
  sendMentionEmail,
} = require('../../utils/notificationService');

const MENTION_REGEX = /@(\w+)/g;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getMentionedNames = (content) => {
  const matches = content.match(MENTION_REGEX);
  if (!matches) {
    return [];
  }

  return [...new Set(matches.map((mention) => mention.substring(1)))];
};

const notifyTaskAssigneeAboutComment = async ({ io, task, taskId, user, content }) => {
  if (!task.assignee || task.assignee.toString() === user._id.toString()) {
    return;
  }

  await sendNotification(io, {
    recipientId: task.assignee,
    senderId: user._id,
    type: 'new_comment',
    relatedId: taskId,
    relatedModel: 'Task',
    message: `commented on: ${task.title}`,
  });

  await sendCommentEmail(task.assignee, {
    commenterName: user.name,
    task,
    projectId: task.project,
    comment: content,
  });
};

const notifyMentionedUsers = async ({ io, task, taskId, user, content }) => {
  const uniqueNames = getMentionedNames(content);

  for (const name of uniqueNames) {
    const mentionedUser = await User.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}`, 'i') },
    });

    if (!mentionedUser || mentionedUser._id.toString() === user._id.toString()) {
      continue;
    }

    await sendNotification(io, {
      recipientId: mentionedUser._id,
      senderId: user._id,
      type: 'mention',
      relatedId: taskId,
      relatedModel: 'Task',
      message: 'mentioned you in a comment',
    });

    await sendMentionEmail(mentionedUser._id, {
      mentionerName: user.name,
      task,
      projectId: task.project,
      comment: content,
    });
  }
};

const notifyCommentCreated = async ({ io, task, taskId, user, content }) => {
  await notifyTaskAssigneeAboutComment({ io, task, taskId, user, content });
  await notifyMentionedUsers({ io, task, taskId, user, content });
};

module.exports = {
  notifyCommentCreated,
};
