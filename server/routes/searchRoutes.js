const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Global search across tasks, projects, and users
// @route   GET /api/search?q=query
const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ tasks: [], projects: [], users: [] });
        }

        const searchRegex = new RegExp(q, 'i');

        // Search Tasks (user has access to)
        const tasks = await Task.find({
            $or: [
                { title: searchRegex },
                { description: searchRegex }
            ],
            $or: [
                { assignee: req.user._id },
                { reporter: req.user._id }
            ]
        })
            .populate('project', 'name')
            .populate('assignee', 'name avatar')
            .limit(10)
            .select('title status priority project');

        // Search Projects (user is member of)
        const projects = await Project.find({
            name: searchRegex,
            members: req.user._id
        })
            .limit(5)
            .select('name');

        // Search Team Members (in user's organizations)
        const users = await User.find({
            $or: [
                { name: searchRegex },
                { email: searchRegex }
            ]
        })
            .limit(5)
            .select('name email avatar');

        res.json({ tasks, projects, users });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ message: error.message });
    }
};

router.get('/', protect, globalSearch);

module.exports = router;
