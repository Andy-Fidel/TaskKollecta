const express = require('express');
const router = express.Router();
const { getNotifications, markRead, deleteNotification, clearAllNotifications, updateNotificationStatus } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.put('/read', protect, markRead);
router.put('/:id/status', protect, updateNotificationStatus);
router.delete('/:id', protect, deleteNotification);
router.delete('/', protect, clearAllNotifications);

module.exports = router;