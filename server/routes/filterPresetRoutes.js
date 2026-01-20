const express = require('express');
const router = express.Router();
const { getPresets, createPreset, deletePreset } = require('../controllers/filterPresetController');
const { protect } = require('../middleware/authMiddleware');

router.get('/project/:projectId', protect, getPresets);
router.post('/', protect, createPreset);
router.delete('/:id', protect, deletePreset);

module.exports = router;
