const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSprintAnalytics,
  getWorkloadAnalytics,
  recordProductEvent,
  getProductAdoptionAnalytics,
  getTeamAuditEvents,
} = require('../controllers/analyticsController');

router.post('/events', protect, recordProductEvent);
router.get('/product-adoption', protect, getProductAdoptionAnalytics);
router.get('/team-audit', protect, getTeamAuditEvents);
router.get('/sprint/:projectId', protect, getSprintAnalytics);
router.get('/workload/:projectId', protect, getWorkloadAnalytics);

module.exports = router;
