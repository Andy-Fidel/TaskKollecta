const Activity = require('../models/Activity');

const logActivity = async (req, { task, action, details }) => {
  try {
    const activity = await Activity.create({
      task: task._id,
      user: req.user._id, 
      action,
      details
    });
    
    // Optional: If using real-time socket, emit event here so UI updates instantly
    if (req.io) {
       const populated = await Activity.findById(activity._id).populate('user', 'name avatar');
       req.io.to(task.project.toString()).emit('new_activity', populated);
    }
  } catch (error) {
    console.error("Activity Log Error:", error);
  }
};

module.exports = { logActivity };