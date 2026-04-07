const Notification = require('../../models/Notification');
const { createDomainError } = require('../shared/errors');

const ensureNotificationOwnership = async ({ notificationId, userId }) => {
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    throw createDomainError(404, 'Notification not found');
  }

  if (notification.recipient.toString() !== userId.toString()) {
    throw createDomainError(401, 'Not authorized');
  }

  return notification;
};

const getNotifications = async ({ userId }) => {
  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('sender', 'name avatar');

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    $or: [{ status: 'unread' }, { isRead: false, status: { $ne: 'archived' } }],
  });

  return { notifications, unreadCount };
};

const markRead = async ({ userId }) => {
  await Notification.updateMany(
    { recipient: userId, $or: [{ isRead: false }, { status: 'unread' }] },
    { $set: { isRead: true, status: 'read' } },
  );

  return { message: 'Marked as read' };
};

const deleteNotification = async ({ notificationId, userId }) => {
  const notification = await ensureNotificationOwnership({ notificationId, userId });
  await notification.deleteOne();
  return { message: 'Notification removed' };
};

const clearAllNotifications = async ({ userId }) => {
  await Notification.deleteMany({ recipient: userId });
  return { message: 'All notifications cleared' };
};

const updateNotificationStatus = async ({ notificationId, userId, status }) => {
  const notification = await ensureNotificationOwnership({ notificationId, userId });

  if (['unread', 'read', 'archived'].includes(status)) {
    notification.status = status;
    notification.isRead = status === 'read' || status === 'archived';
    await notification.save();
  }

  return notification;
};

module.exports = {
  getNotifications,
  markRead,
  deleteNotification,
  clearAllNotifications,
  updateNotificationStatus,
};
