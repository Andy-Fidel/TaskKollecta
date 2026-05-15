import { describe, expect, it, vi } from 'vitest';
import './setup';
import User from '../models/User';
import Notification from '../models/Notification';

const { sendNotification } = require('../utils/notificationService');

describe('notification preferences', () => {
  it('does not create in-app notifications when the category is disabled', async () => {
    const recipient = await User.create({
      name: 'Muted Recipient',
      email: 'muted-recipient@test.com',
      password: 'password123',
      notificationPreferences: {
        inAppComments: false,
      },
    });

    const sender = await User.create({
      name: 'Comment Sender',
      email: 'comment-sender@test.com',
      password: 'password123',
    });

    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })) };

    const result = await sendNotification(io, {
      recipientId: recipient._id,
      senderId: sender._id,
      type: 'new_comment',
      relatedId: recipient._id,
      relatedModel: 'Task',
      message: 'commented on a task',
    });

    const notifications = await Notification.find({ recipient: recipient._id });

    expect(result).toBeUndefined();
    expect(notifications).toHaveLength(0);
    expect(io.to).not.toHaveBeenCalled();
  });

  it('creates in-app notifications when the category is enabled by default', async () => {
    const recipient = await User.create({
      name: 'Default Recipient',
      email: 'default-recipient@test.com',
      password: 'password123',
    });

    const sender = await User.create({
      name: 'Assignment Sender',
      email: 'assignment-sender@test.com',
      password: 'password123',
    });

    const emit = vi.fn();
    const io = { to: vi.fn(() => ({ emit })) };

    const result = await sendNotification(io, {
      recipientId: recipient._id,
      senderId: sender._id,
      type: 'task_assigned',
      relatedId: recipient._id,
      relatedModel: 'Task',
      message: 'assigned you a task',
    });

    const notifications = await Notification.find({ recipient: recipient._id });

    expect(result?._id).toBeTruthy();
    expect(notifications).toHaveLength(1);
    expect(io.to).toHaveBeenCalledWith(`user_${recipient._id}`);
    expect(emit).toHaveBeenCalledWith('new_notification', expect.objectContaining({
      type: 'task_assigned',
    }));
  });
});
