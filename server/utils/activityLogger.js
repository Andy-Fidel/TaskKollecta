const Activity = require('../models/Activity');

const logActivity = async (req, { task, action, details }) => {
  try {
    const activity = await Activity.create({
      task: task._id,
      user: req.user._id,
      // ⬇️ ADD THIS: Link it to the project so you can find it later!
      project: task.project, 
      action,
      details
    });
    
    if (req.io) {
        // Populate user to show "John Doe" instead of "ID: 5f23..."
       const populated = await Activity.findById(activity._id)
          .populate('user', 'name avatar')
          .populate('task', 'title'); // Optional: populate task title too

       // Emit to the specific project room
       req.io.to(task.project.toString()).emit('new_activity', populated);
    }
  } catch (error) {
    console.error("Activity Log Error:", error);
  }
};

module.exports = { logActivity };