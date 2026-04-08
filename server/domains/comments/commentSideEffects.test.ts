import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../tests/setup';
import mongoose from 'mongoose';
import User from '../../models/User';
import Notification from '../../models/Notification';

const commentSideEffects = require('./commentSideEffects');

describe('commentSideEffects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates assignee and unique mention notifications, excluding the author', async () => {
    const author = await User.create({
      name: 'Author',
      email: 'comment-sideeffects-author@test.com',
      password: 'password123',
    });

    const assignee = await User.create({
      name: 'Assigned User',
      email: 'comment-sideeffects-assignee@test.com',
      password: 'password123',
      notificationPreferences: {
        emailComments: false,
      },
    });

    const mentioned = await User.create({
      name: 'John Mentioned',
      email: 'comment-sideeffects-mentioned@test.com',
      password: 'password123',
      notificationPreferences: {
        emailMentions: false,
      },
    });

    const taskId = new mongoose.Types.ObjectId();

    await commentSideEffects.notifyCommentCreated({
      io: { to: vi.fn(() => ({ emit: vi.fn() })) },
      task: {
        title: 'Comment Task',
        assignee: assignee._id,
        project: new mongoose.Types.ObjectId(),
      },
      taskId,
      user: author,
      content: 'Ping @John and @John plus @Author for review',
    });

    const notifications = await Notification.find({ sender: author._id }).sort({ type: 1 });
    expect(notifications).toHaveLength(2);
    expect(notifications.map((notification) => notification.type).sort()).toEqual(['mention', 'new_comment']);
    expect(notifications.some((notification) => notification.recipient.toString() === assignee._id.toString())).toBe(true);
    expect(notifications.some((notification) => notification.recipient.toString() === mentioned._id.toString())).toBe(true);
  });

  it('skips assignee notification when the commenter is the assignee', async () => {
    const user = await User.create({
      name: 'Same User',
      email: 'comment-sideeffects-self@test.com',
      password: 'password123',
      notificationPreferences: {
        emailComments: false,
        emailMentions: false,
      },
    });

    await commentSideEffects.notifyCommentCreated({
      io: { to: vi.fn(() => ({ emit: vi.fn() })) },
      task: {
        title: 'Comment Task',
        assignee: user._id,
        project: new mongoose.Types.ObjectId(),
      },
      taskId: new mongoose.Types.ObjectId(),
      user,
      content: 'No mentions here',
    });

    expect(await Notification.countDocuments()).toBe(0);
  });
});
