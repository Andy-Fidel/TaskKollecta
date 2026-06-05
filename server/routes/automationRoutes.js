const express = require('express');
const router = express.Router();
const { getAutomations, createAutomation, updateAutomation, deleteAutomation } = require('../controllers/automationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:projectId', protect, getAutomations);
router.post('/', protect, createAutomation);
router.put('/:id', protect, updateAutomation);
router.patch('/:id', protect, updateAutomation);
router.delete('/:id', protect, deleteAutomation);

module.exports = router;
