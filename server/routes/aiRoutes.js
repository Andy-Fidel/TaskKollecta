const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getTaskBreakdown, 
  getTaskDescription,
  getDailyDigest,
  getSmartFocus,
  getSuggestedPriority,
  getSuggestedEffort,
  getGeneratedSubtasks,
  getProjectHealthSnapshot,
  getProjectRisks
} = require('../controllers/aiController');

// All AI routes require authentication
router.post('/breakdown', protect, getTaskBreakdown);
router.post('/describe', protect, getTaskDescription);
router.post('/suggest-priority', protect, getSuggestedPriority);
router.post('/suggest-effort', protect, getSuggestedEffort);
router.post('/generate-subtasks', protect, getGeneratedSubtasks);
router.get('/digest', protect, getDailyDigest);
router.get('/focus', protect, getSmartFocus);
router.get('/projects/:projectId/health', protect, getProjectHealthSnapshot);
router.get('/projects/:projectId/risks', protect, getProjectRisks);

module.exports = router;
