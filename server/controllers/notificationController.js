const Notification = require('../models/Notification');

// @desc    Get user's notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20) 
      .populate('sender', 'name avatar');
    
    const unreadCount = await Notification.countDocuments({ 
        recipient: req.user._id, 
        $or: [{ status: 'unread' }, { isRead: false, status: { $ne: 'archived' } }]
    });
    
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all as read
const markRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, $or: [{ isRead: false }, { status: 'unread' }] },
      { $set: { isRead: true, status: 'read' } }
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a single notification
// @route   DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await notification.deleteOne();
    res.json({ message: 'Notification removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear ALL notifications for user
// @route   DELETE /api/notifications
const clearAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({ recipient: req.user._id });
        res.json({ message: 'All notifications cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Update a specific notification's status (read, unread, archived)
// @route   PUT /api/notifications/:id/status
const updateNotificationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (['unread', 'read', 'archived'].includes(status)) {
        notification.status = status;
        notification.isRead = (status === 'read' || status === 'archived');
        await notification.save();
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotifications, markRead, deleteNotification, clearAllNotifications, updateNotificationStatus };