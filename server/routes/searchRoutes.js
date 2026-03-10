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
        const { q, orgId } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ tasks: [], projects: [], users: [] });
        }

        // Escape regex special characters to prevent ReDoS
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escaped, 'i');

        // Build query conditions based on orgId if provided
        const taskQuery = {
            $and: [
                { $or: [{ title: searchRegex }, { description: searchRegex }] },
                { $or: [{ assignee: req.user._id }, { reporter: req.user._id }] }
            ]
        };
        const projectQuery = {
            name: searchRegex,
            members: req.user._id
        };

        if (orgId) {
            taskQuery.organization = orgId;
            projectQuery.organization = orgId;
        }

        const tasks = await Task.find(taskQuery)
            .populate('project', 'name')
            .populate('assignee', 'name avatar')
            .limit(10)
            .select('title status priority project');

        // Search Projects (user is member of)
        const projects = await Project.find(projectQuery)
            .limit(5)
            .select('name');

        // Search Team Members - To properly scope this, we'd need to search Memberships matching orgId
        // For now, we'll keep it global or we can filter out by orgId if available.
        // Users model doesn't have an organization field. 
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
