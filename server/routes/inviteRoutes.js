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

// Public - validate token
router.get('/:token', validateInvite);

// Protected routes
router.post('/', protect, createInvite);
router.post('/:token/accept', protect, acceptInvite);
router.get('/org/:orgId', protect, getOrgInvites);
router.delete('/:id', protect, cancelInvite);

module.exports = router;
