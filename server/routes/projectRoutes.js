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

// Create Project
router.post('/', protect, checkRole('owner', 'admin', 'member'), createProject);

// Get All Projects (Global)
router.get('/', protect, getAllProjects);

// Update/Delete
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

// Org Specific Routes
router.get('/:orgId', protect, checkRole('owner', 'admin', 'member', 'guest'), getOrgProjects);

// Project Specific Routes
router.get('/single/:id', protect, getProjectDetails);
router.get('/analytics/:id', protect, getProjectAnalytics);
router.post('/:id/updates', protect, createUpdate);
router.get('/:id/updates', protect, getUpdates);

module.exports = router;