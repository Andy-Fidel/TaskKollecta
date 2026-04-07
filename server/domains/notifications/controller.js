const notificationService = require('./notificationService');
const { handleDomainError } = require('../shared/errors');

const getNotifications = async (req, res) => {
  try {
    const result = await notificationService.getNotifications({
      userId: req.user._id,
    });
    res.json(result);
  } catch (error) {
    handleDomainError(res, error);
  }
};

const markRead = async (req, res) => {
  try {
    const result = await notificationService.markRead({
      userId: req.user._id,
    });
    res.json(result);
  } catch (error) {
    handleDomainError(res, error);
  }
};

const deleteNotification = async (req, res) => {
  try {
    const result = await notificationService.deleteNotification({
      notificationId: req.params.id,
      userId: req.user._id,
    });
    res.json(result);
  } catch (error) {
    handleDomainError(res, error);
  }
};

const clearAllNotifications = async (req, res) => {
  try {
    const result = await notificationService.clearAllNotifications({
      userId: req.user._id,
    });
    res.json(result);
  } catch (error) {
    handleDomainError(res, error);
  }
};

const updateNotificationStatus = async (req, res) => {
  try {
    const notification = await notificationService.updateNotificationStatus({
      notificationId: req.params.id,
      userId: req.user._id,
      status: req.body.status,
    });
    res.json(notification);
  } catch (error) {
    handleDomainError(res, error);
  }
};

module.exports = {
  getNotifications,
  markRead,
  deleteNotification,
  clearAllNotifications,
  updateNotificationStatus,
};
