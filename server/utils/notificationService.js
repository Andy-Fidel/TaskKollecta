const Notification = require('../models/Notification');

const sendNotification = async (io, { recipientId, senderId, type, relatedId, relatedModel, message }) => {
  try {
    // 1. Don't notify yourself
    if (recipientId.toString() === senderId.toString()) return;

    // 2. Create in DB
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      relatedId,
      relatedModel,
      message
    });

    const populated = await Notification.findById(notification._id)
      .populate('sender', 'name avatar');

    // 3. Emit Real-time Event via Socket.io
    // We emit to a room named after the user's ID (secure private channel)
    io.to(recipientId.toString()).emit('new_notification', populated);
    
    return populated;
  } catch (error) {
    console.error("Notification Error:", error);
  }
};

module.exports = { sendNotification };