const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Announcement = require('../models/Announcement');
const { getIo } = require('../socket'); // assuming socket logic is extracted, wait, lets check server.js for socket io

// @desc    Get active announcement
// @route   GET /api/announcements/active
// @access  Private
router.get('/active', protect, async (req, res) => {
    try {
        const announcement = await Announcement.findOne({ isActive: true }).sort({ createdAt: -1 });
        res.json(announcement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
