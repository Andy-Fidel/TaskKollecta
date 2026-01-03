const express = require('express');
const router = express.Router();
const { createOrganization, getUserOrganizations, getOrgMembers, addMember } = require('../controllers/organizationController');
const { protect } = require('../middleware/authMiddleware');

// All routes here should be protected
router.post('/', protect, createOrganization);
router.get('/', protect, getUserOrganizations);
router.get('/:id/members', protect, getOrgMembers);
router.post('/:id/members', protect, addMember);

module.exports = router;