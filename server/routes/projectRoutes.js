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
const { checkOrgRole } = require('../middleware/roleMiddleware'); 

// Create Project
router.post('/', protect, checkOrgRole('member'), createProject);

// Get All Projects (Global)
router.get('/', protect, getAllProjects);

// Update/Delete
router.put('/:id', protect, updateProject); 
router.delete('/:id', protect, deleteProject);

// Org Specific Routes
router.get('/:orgId', protect, checkOrgRole('member'), getOrgProjects);

// Project Specific Routes
router.get('/single/:id', protect, getProjectDetails);
router.get('/analytics/:id', protect, getProjectAnalytics);
router.post('/:id/updates', protect, createUpdate);
router.get('/:id/updates', protect, getUpdates);

module.exports = router;