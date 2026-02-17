const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSprintAnalytics, getWorkloadAnalytics } = require('../controllers/analyticsController');

router.get('/sprint/:projectId', protect, getSprintAnalytics);
router.get('/workload/:projectId', protect, getWorkloadAnalytics);

module.exports = router;
