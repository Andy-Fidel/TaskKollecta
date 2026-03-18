const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getTaskBreakdown, getTaskDescription } = require('../controllers/aiController');

// All AI routes require authentication
router.post('/breakdown', protect, getTaskBreakdown);
router.post('/describe', protect, getTaskDescription);

module.exports = router;
