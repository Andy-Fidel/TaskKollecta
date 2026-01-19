const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { protect } = require('../middleware/authMiddleware');

// Get paginated logs for a specific task
router.get('/task/:taskId', protect, async (req, res) => {
  try {
    const { taskId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const before = req.query.before; // Cursor timestamp

    const query = { task: taskId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Get activities + 1 to check for more
    const activities = await Activity.find(query)
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = activities.length > limit;
    const data = hasMore ? activities.slice(0, limit) : activities;

    res.json({
      activities: data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.createdAt?.toISOString() : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;