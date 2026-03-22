const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getTaskBreakdown, 
  getTaskDescription,
  getDailyDigest,
  getProjectRisks
} = require('../controllers/aiController');

// All AI routes require authentication
router.post('/breakdown', protect, getTaskBreakdown);
router.post('/describe', protect, getTaskDescription);
router.get('/digest', protect, getDailyDigest);
router.get('/projects/:projectId/risks', protect, getProjectRisks);

module.exports = router;
