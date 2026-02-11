const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Task = require('../models/Task');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/stats
 */
const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Total counts
        const [totalUsers, totalOrgs, totalProjects, totalTasks] = await Promise.all([
            User.countDocuments(),
            Organization.countDocuments(),
            Project.countDocuments(),
            Task.countDocuments()
        ]);

        // New this week
        const [newUsersWeek, newOrgsWeek, newTasksWeek] = await Promise.all([
            User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            Organization.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            Task.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
        ]);

        // User status breakdown
        const userStatusCounts = await User.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const statusBreakdown = {
            active: 0,
            suspended: 0,
            banned: 0
        };
        userStatusCounts.forEach(s => {
            if (s._id) statusBreakdown[s._id] = s.count;
        });

        // Growth data (last 30 days - daily signups)
        const growthData = await User.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            totals: {
                users: totalUsers,
                organizations: totalOrgs,
                projects: totalProjects,
                tasks: totalTasks
            },
            thisWeek: {
                users: newUsersWeek,
                organizations: newOrgsWeek,
                tasks: newTasksWeek
            },
            userStatus: statusBreakdown,
            growth: growthData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get system health metrics
 * @route   GET /api/admin/health
 */
const getSystemHealth = async (req, res) => {
    try {
        const mongoose = require('mongoose');

        // Database status
        const dbState = mongoose.connection.readyState;
        const dbStates = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        // Memory usage
        const memoryUsage = process.memoryUsage();
        const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

        // Uptime
        const uptime = process.uptime();
        const formatUptime = (seconds) => {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${days}d ${hours}h ${minutes}m`;
        };

        res.json({
            database: {
                status: dbStates[dbState] || 'unknown',
                connected: dbState === 1
            },
            memory: {
                heapUsed: formatBytes(memoryUsage.heapUsed),
                heapTotal: formatBytes(memoryUsage.heapTotal),
                rss: formatBytes(memoryUsage.rss)
            },
            uptime: formatUptime(uptime),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all users (paginated)
 * @route   GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const status = req.query.status;
        const role = req.query.role;

        const query = {};

        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { email: { $regex: escaped, $options: 'i' } }
            ];
        }

        if (status) query.status = status;
        if (role) query.role = role;

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password -resetPasswordToken -resetPasswordExpire')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            User.countDocuments(query)
        ]);

        res.json({
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Suspend a user
 * @route   PUT /api/admin/users/:id/suspend
 */
const suspendUser = async (req, res) => {
    try {
        const { reason } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'Cannot suspend a superadmin' });
        }

        user.status = 'suspended';
        user.suspendedAt = new Date();
        user.suspendReason = reason || 'No reason provided';
        await user.save();

        res.json({ message: 'User suspended successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Ban a user
 * @route   PUT /api/admin/users/:id/ban
 */
const banUser = async (req, res) => {
    try {
        const { reason } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'Cannot ban a superadmin' });
        }

        user.status = 'banned';
        user.bannedAt = new Date();
        user.banReason = reason || 'No reason provided';
        await user.save();

        res.json({ message: 'User banned successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Activate a user (remove suspension/ban)
 * @route   PUT /api/admin/users/:id/activate
 */
const activateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.status = 'active';
        user.suspendedAt = undefined;
        user.bannedAt = undefined;
        user.suspendReason = undefined;
        user.banReason = undefined;
        await user.save();

        res.json({ message: 'User activated successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Reset user password (admin action)
 * @route   POST /api/admin/users/:id/reset-password
 */
const adminResetPassword = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Generate a temporary password
        const tempPassword = crypto.randomBytes(8).toString('hex');

        // Let the pre-save hook handle hashing
        user.password = tempPassword;
        await user.save();

        // Send email with temporary password
        await sendEmail({
            email: user.email,
            subject: 'Your Password Has Been Reset',
            message: `
        <h2>Password Reset by Administrator</h2>
        <p>Your password has been reset by an administrator.</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>Please log in and change your password immediately.</p>
        <a href="${process.env.CLIENT_URL}/login" style="display:inline-block; margin-top:10px; background: #6366f1; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
      `
        });

        res.json({ message: 'Password reset email sent to user' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Change user role
 * @route   PUT /api/admin/users/:id/role
 */
const changeUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin', 'superadmin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Only allow one superadmin to promote to superadmin
        if (role === 'superadmin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Only superadmins can promote to superadmin' });
        }

        user.role = role;
        await user.save();

        res.json({ message: `User role changed to ${role}`, user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getSystemHealth,
    getAllUsers,
    suspendUser,
    banUser,
    activateUser,
    adminResetPassword,
    changeUserRole
};
