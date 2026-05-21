const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
    createInvite,
    createBulkInvites,
    validateInvite,
    acceptInvite,
    getOrgInvites,
    cancelInvite,
    resendInvite
} = require('./controller');

// Protected routes (specific paths first)
router.post('/', protect, createInvite);
router.post('/bulk', protect, createBulkInvites);
router.get('/org/:orgId', protect, getOrgInvites);
router.post('/:id/resend', protect, resendInvite);

// Parameterized routes (must come after specific routes)
router.get('/:token', validateInvite);
router.post('/:token/accept', protect, acceptInvite);
router.delete('/:id', protect, cancelInvite);

module.exports = router;
