const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createInvite,
    validateInvite,
    acceptInvite,
    getOrgInvites,
    cancelInvite
} = require('../controllers/inviteController');

// Protected routes (specific paths first)
router.post('/', protect, createInvite);
router.get('/org/:orgId', protect, getOrgInvites);

// Parameterized routes (must come after specific routes)
router.get('/:token', validateInvite);
router.post('/:token/accept', protect, acceptInvite);
router.delete('/:id', protect, cancelInvite);

module.exports = router;
