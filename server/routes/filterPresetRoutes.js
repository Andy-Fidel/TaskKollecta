const express = require('express');
const router = express.Router();
const { getPresets, getMyTaskPresets, getWorkspacePresets, createPreset, updatePreset, duplicatePreset, deletePreset } = require('../controllers/filterPresetController');
const { protect } = require('../middleware/authMiddleware');

router.get('/project/:projectId', protect, getPresets);
router.get('/my-tasks', protect, getMyTaskPresets);
router.get('/workspace', protect, getWorkspacePresets);
router.post('/', protect, createPreset);
router.post('/:id/duplicate', protect, duplicatePreset);
router.put('/:id', protect, updatePreset);
router.delete('/:id', protect, deletePreset);

module.exports = router;
