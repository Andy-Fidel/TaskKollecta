const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Announcement = require('../models/Announcement');
const Membership = require('../models/Membership');

// @desc    Get active announcement
// @route   GET /api/announcements/active
// @access  Private
router.get('/active', protect, async (req, res) => {
    try {
        const now = new Date();
        const memberships = await Membership.find({ user: req.user._id }).select('organization');
        const orgIds = memberships.map((membership) => membership.organization);
        const announcement = await Announcement.findOne({
            isActive: true,
            $and: [
                { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
                { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }] },
                { $or: [{ targetRoles: { $size: 0 } }, { targetRoles: req.user.role }] },
                { $or: [{ targetOrganizations: { $size: 0 } }, { targetOrganizations: { $in: orgIds } }] },
            ],
        }).sort({ createdAt: -1 });
        res.json(announcement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
