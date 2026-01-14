const express = require('express');
const router = express.Router();
const {searchOrganizations, requestToJoin, getJoinRequests, resolveJoinRequest, createOrganization, getUserOrganizations, getOrgMembers, addMember } = require('../controllers/organizationController');
const { protect } = require('../middleware/authMiddleware');
const { checkOrgRole } = require('../middleware/roleMiddleware');

router.get('/search', protect, searchOrganizations);
router.post('/:id/join', protect, requestToJoin);

router.get('/:id/requests', protect, checkOrgRole('admin'), getJoinRequests);
router.post('/:id/requests/:requestId/resolve', protect, checkOrgRole('admin'), resolveJoinRequest);

// All routes here should be protected
router.post('/', protect, createOrganization);
router.get('/', protect, getUserOrganizations);
router.get('/:id/members', protect, getOrgMembers);
router.post('/:id/members', protect, addMember);

module.exports = router;