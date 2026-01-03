const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { protect } = require('../middleware/authMiddleware');

// Get logs for a specific task
router.get('/task/:taskId', protect, async (req, res) => {
  try {
    const activities = await Activity.find({ task: req.params.taskId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 }); // Newest first
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;