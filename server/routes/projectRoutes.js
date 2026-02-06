const express = require('express');
const router = express.Router();
const {
  createProject,
  getOrgProjects,
  getProjectDetails,
  getProjectAnalytics,
  createUpdate,
  getUpdates,
  updateProject,
  deleteProject,
  getAllProjects
} = require('../controllers/projectController');

const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const { cacheResponse } = require('../middleware/cacheMiddleware');

// Create Project
router.post('/', protect, checkRole('owner', 'admin', 'member'), createProject);

// Get All Projects (Global) - cached for 120 seconds
router.get('/', protect, cacheResponse(120), getAllProjects);

// Update/Delete
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

// Org Specific Routes - cached for 120 seconds
router.get('/:orgId', protect, checkRole('owner', 'admin', 'member', 'guest'), cacheResponse(120), getOrgProjects);

// Project Specific Routes
router.get('/single/:id', protect, cacheResponse(60), getProjectDetails);
router.get('/analytics/:id', protect, cacheResponse(60), getProjectAnalytics);
router.post('/:id/updates', protect, createUpdate);
router.get('/:id/updates', protect, cacheResponse(60), getUpdates);

module.exports = router;