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

  it('rejects unsupported notification statuses', async () => {
    const notification = await Notification.create({
      recipient: recipient._id,
      sender: sender._id,
      type: 'new_comment',
      relatedId: recipient._id,
      relatedModel: 'Task',
      message: 'Protected',
    });

    await expect(
      notificationService.updateNotificationStatus({
        notificationId: notification._id.toString(),
        userId: recipient._id,
        status: 'muted',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Invalid notification status',
    });
  });

  it('snoozes notifications until a future time and restores expired snoozes', async () => {
    const active = await Notification.create({
      recipient: recipient._id,
      sender: sender._id,
      type: 'new_comment',
      relatedId: recipient._id,
      relatedModel: 'Task',
      message: 'Snooze me',
      status: 'unread',
      isRead: false,
    });

    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000);
    const snoozed = await notificationService.updateNotificationStatus({
      notificationId: active._id.toString(),
      userId: recipient._id,
      status: 'snoozed',
      snoozedUntil,
    });

    expect(snoozed.status).toBe('snoozed');
    expect(snoozed.isRead).toBe(true);

    const hidden = await notificationService.getNotifications({ userId: recipient._id });
    expect(hidden.notifications).toHaveLength(0);
    expect(hidden.unreadCount).toBe(0);

    await Notification.findByIdAndUpdate(active._id, {
      status: 'snoozed',
      isRead: true,
      snoozedUntil: new Date(Date.now() - 60 * 1000),
    });

    const restored = await notificationService.getNotifications({ userId: recipient._id });
    expect(restored.notifications).toHaveLength(1);
    expect(restored.notifications[0].status).toBe('unread');
    expect(restored.unreadCount).toBe(1);
  });

  it('requires a future snooze time', async () => {
    const notification = await Notification.create({
      recipient: recipient._id,
      sender: sender._id,
      type: 'new_comment',
      relatedId: recipient._id,
      relatedModel: 'Task',
      message: 'Protected',
    });

    await expect(
      notificationService.updateNotificationStatus({
        notificationId: notification._id.toString(),
        userId: recipient._id,
        status: 'snoozed',
        snoozedUntil: new Date(Date.now() - 1000),
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Valid future snoozedUntil is required',
    });
  });
});
