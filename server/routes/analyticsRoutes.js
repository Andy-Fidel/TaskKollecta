const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSprintAnalytics,
  getWorkloadAnalytics,
  recordProductEvent,
  getProductAdoptionAnalytics,
} = require('../controllers/analyticsController');

router.post('/events', protect, recordProductEvent);
router.get('/product-adoption', protect, getProductAdoptionAnalytics);
router.get('/sprint/:projectId', protect, getSprintAnalytics);
router.get('/workload/:projectId', protect, getWorkloadAnalytics);

module.exports = router;
