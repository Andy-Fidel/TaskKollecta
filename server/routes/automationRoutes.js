const express = require('express');
const router = express.Router();
const { getAutomations, createAutomation, deleteAutomation } = require('../controllers/automationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:projectId', protect, getAutomations);
router.post('/', protect, createAutomation);
router.delete('/:id', protect, deleteAutomation);

module.exports = router;