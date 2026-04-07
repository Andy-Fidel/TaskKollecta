import { beforeEach, describe, expect, it } from 'vitest';
import '../../tests/setup';
import User from '../../models/User';
import Notification from '../../models/Notification';

const notificationService = require('./notificationService');

describe('notificationService', () => {
  let recipient: any;
  let sender: any;

  beforeEach(async () => {
    recipient = await User.create({
      name: 'Recipient User',
      email: 'recipient-notification@test.com',
      password: 'password123',
    });

    sender = await User.create({
      name: 'Sender User',
      email: 'sender-notification@test.com',
      password: 'password123',
    });
  });

  it('marks unread notifications as read', async () => {
    await Notification.create([
      {
        recipient: recipient._id,
        sender: sender._id,
        type: 'new_comment',
        relatedId: recipient._id,
        relatedModel: 'Task',
        message: 'Unread one',
        isRead: false,
        status: 'unread',
      },
      {
        recipient: recipient._id,
        sender: sender._id,
        type: 'mention',
        relatedId: recipient._id,
        relatedModel: 'Task',
        message: 'Unread two',
        isRead: false,
        status: 'unread',
      },
    ]);

    const result = await notificationService.markRead({ userId: recipient._id });
    expect(result.message).toBe('Marked as read');

    const notifications = await Notification.find({ recipient: recipient._id });
    expect(notifications.every((notification) => notification.isRead && notification.status === 'read')).toBe(true);
  });

  it('prevents users from deleting notifications they do not own', async () => {
    const otherUser = await User.create({
      name: 'Other User',
      email: 'other-notification@test.com',
      password: 'password123',
    });

    const notification = await Notification.create({
      recipient: recipient._id,
      sender: sender._id,
      type: 'new_comment',
      relatedId: recipient._id,
      relatedModel: 'Task',
      message: 'Protected',
    });

    await expect(
      notificationService.deleteNotification({
        notificationId: notification._id.toString(),
        userId: otherUser._id,
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Not authorized',
    });
  });
});
