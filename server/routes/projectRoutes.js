const express = require('express');
const router = express.Router();
const { createProject, getOrgProjects, getProjectDetails,
     getProjectAnalytics, createUpdate, getUpdates, updateProject, deleteProject, getAllProjects } = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { checkOrgRole } = require('../middleware/roleMiddleware');

// Route: POST /api/projects
// Requirements: Logged In + Must be at least a 'manager' or 'admin' of the Org
router.post('/', protect, checkOrgRole('admin', 'manager'), createProject);
// Route: GET /api/projects
// Requirements: Logged In + Must be a member of at least one Org
router.get('/', protect, getAllProjects);
router.put('/:id', protect, updateProject); // Check role middleware if strictly needed
router.delete('/:id', protect, deleteProject);


// Route: GET /api/projects/:orgId
// Requirements: Logged In + Must be any member of the Org
router.get('/:orgId', protect, checkOrgRole(), getOrgProjects);
router.get('/single/:id', protect, getProjectDetails);
router.get('/analytics/:id', protect, getProjectAnalytics);
router.post('/:id/updates', protect, createUpdate);
router.get('/:id/updates', protect, getUpdates);


module.exports = router;