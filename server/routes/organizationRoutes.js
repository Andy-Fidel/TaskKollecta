const express = require('express');
const router = express.Router();
const { searchOrganizations, requestToJoin, getJoinRequests, resolveJoinRequest, createOrganization, getUserOrganizations, getOrgMembers, addMember, updateMemberRole } = require('../controllers/organizationController');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.get('/search', protect, searchOrganizations);
router.post('/:id/join', protect, requestToJoin);

router.get('/:id/requests', protect, checkRole('owner', 'admin'), getJoinRequests);
router.post('/:id/requests/:requestId/resolve', protect, checkRole('owner', 'admin'), resolveJoinRequest);

// Organization Management
router.post('/', protect, createOrganization);
router.get('/', protect, getUserOrganizations);

// Member Management
router.get('/:id/members', protect, getOrgMembers); // Members can view other members
router.post('/:id/members', protect, checkRole('owner', 'admin'), addMember); // Only Admin/Owner can add
router.put('/:id/members/:userId', protect, checkRole('owner', 'admin'), updateMemberRole); // Only Admin/Owner can update roles

module.exports = router;