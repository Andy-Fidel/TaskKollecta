const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Announcement = require('../models/Announcement');
const Membership = require('../models/Membership');
const Activity = require('../models/Activity');
const AdminAuditLog = require('../models/AdminAuditLog');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');
const os = require('os');
const { createAdminAuditLog, pickUserAuditFields } = require('../utils/adminAudit');
const ProductEvent = require('../models/ProductEvent');
const { getRequestSummary, getEmailSummary } = require('../utils/opsMetrics');
const pkg = require('../package.json');
const RetentionSettings = require('../models/RetentionSettings');

const requireReason = (reason) => {
    const normalized = String(reason || '').trim();
    if (!normalized) {
        const error = new Error('A reason is required for this admin action');
        error.statusCode = 400;
        throw error;
    }
    return normalized;
};

const verifyAdminPassword = async (req, password) => {
    const admin = await User.findById(req.user._id).select('+password');
    if (!admin || !admin.password || !(await bcrypt.compare(password || '', admin.password))) {
        const error = new Error('Re-authentication failed');
        error.statusCode = 401;
        throw error;
    }
};

const ensureNotLastActiveSuperadmin = async (targetUser, nextRole) => {
    if (targetUser.role !== 'superadmin' || nextRole === 'superadmin') return;
    const activeSuperadminCount = await User.countDocuments({ role: 'superadmin', status: 'active' });
    if (targetUser.status === 'active' && activeSuperadminCount <= 1) {
        const error = new Error('Cannot demote the last active superadmin');
        error.statusCode = 403;
        throw error;
    }
};

const handleAdminError = (res, error) => {
    res.status(error.statusCode || 500).json({ message: error.message });
};

const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const escapeCsv = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const buildUserQuery = async (req) => {
    const {
        search = '',
        status,
        role,
        organization,
        createdFrom,
        createdTo,
        lastLoginFrom,
        lastLoginTo,
        inactiveDays,
        oauthProvider,
        onboardingState,
    } = req.query;

    const query = {};

    if (search) {
        const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
            { name: { $regex: escaped, $options: 'i' } },
            { email: { $regex: escaped, $options: 'i' } }
        ];
    }

    if (status && status !== 'all') query.status = status;
    if (role && role !== 'all') query.role = role;

    const createdRange = {};
    const createdFromDate = parseDate(createdFrom);
    const createdToDate = parseDate(createdTo);
    if (createdFromDate) createdRange.$gte = createdFromDate;
    if (createdToDate) createdRange.$lte = createdToDate;
    if (Object.keys(createdRange).length) query.createdAt = createdRange;

    const lastLoginRange = {};
    const lastLoginFromDate = parseDate(lastLoginFrom);
    const lastLoginToDate = parseDate(lastLoginTo);
    if (lastLoginFromDate) lastLoginRange.$gte = lastLoginFromDate;
    if (lastLoginToDate) lastLoginRange.$lte = lastLoginToDate;
    if (Object.keys(lastLoginRange).length) query.lastLogin = lastLoginRange;

    const inactiveDayCount = parseInt(inactiveDays, 10);
    if (!Number.isNaN(inactiveDayCount) && inactiveDayCount > 0) {
        const cutoff = new Date(Date.now() - inactiveDayCount * 24 * 60 * 60 * 1000);
        query.$and = [
            ...(query.$and || []),
            { $or: [{ lastLogin: { $lte: cutoff } }, { lastLogin: { $exists: false } }, { lastLogin: null }] },
        ];
    }

    if (oauthProvider && oauthProvider !== 'all') {
        if (oauthProvider === 'google') query.googleId = { $exists: true, $nin: [null, ''] };
        if (oauthProvider === 'microsoft') query.microsoftId = { $exists: true, $nin: [null, ''] };
        if (oauthProvider === 'password') {
            query.$and = [
                ...(query.$and || []),
                { $or: [{ googleId: { $exists: false } }, { googleId: null }, { googleId: '' }] },
                { $or: [{ microsoftId: { $exists: false } }, { microsoftId: null }, { microsoftId: '' }] },
            ];
        }
    }

    if (onboardingState && onboardingState !== 'all') {
        if (onboardingState === 'completed') query.onboardingCompleted = true;
        if (onboardingState === 'incomplete') query.onboardingCompleted = { $ne: true };
        if (onboardingState === 'skipped') query.onboardingSkipped = true;
    }

    if (organization && organization !== 'all') {
        const memberships = await Membership.find({ organization }).select('user');
        query._id = { $in: memberships.map((membership) => membership.user) };
    }

    return query;
};

const buildUserSort = (req) => {
    const allowed = new Set(['name', 'email', 'status', 'role', 'createdAt', 'lastLogin']);
    const sortBy = allowed.has(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortDir = req.query.sortDir === 'asc' ? 1 : -1;
    return { [sortBy]: sortDir };
};

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

        // Top organizations (by task count)
        const topOrgs = await Organization.aggregate([
            {
                $lookup: {
                    from: 'projects',
                    localField: '_id',
                    foreignField: 'organization',
                    as: 'projects'
                }
            },
            {
                $lookup: {
                    from: 'tasks',
                    let: { projIds: '$projects._id' },
                    pipeline: [
                        { $match: { $expr: { $in: ['$project', '$$projIds'] } } }
                    ],
                    as: 'tasks'
                }
            },
            {
                $project: {
                    name: 1,
                    memberCount: { $size: { $ifNull: ['$members', []] } },
                    projectCount: { $size: '$projects' },
                    taskCount: { $size: '$tasks' }
                }
            },
            { $sort: { taskCount: -1 } },
            { $limit: 5 }
        ]);

        // Task activity (last 30 days - daily tasks created)
        const taskActivity = await Task.aggregate([
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
            growth: growthData,
            topOrgs,
            taskActivity
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
        
        // System Memory & CPU
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMemPercent = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);
        const cpuPercent = Math.min((os.loadavg()[0] / os.cpus().length) * 100, 100).toFixed(1);
        const dbStart = process.hrtime.bigint();
        let dbLatencyMs = null;
        if (dbState === 1) {
            await mongoose.connection.db.admin().ping();
            dbLatencyMs = Number(process.hrtime.bigint() - dbStart) / 1_000_000;
        }

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
            system: {
                cpuPercent: parseFloat(cpuPercent),
                memoryPercent: parseFloat(usedMemPercent)
            },
            memory: {
                heapUsed: formatBytes(memoryUsage.heapUsed),
                heapTotal: formatBytes(memoryUsage.heapTotal),
                rss: formatBytes(memoryUsage.rss)
            },
            api: getRequestSummary(),
            databaseMetrics: {
                latencyMs: dbLatencyMs === null ? null : Number(dbLatencyMs.toFixed(1)),
            },
            email: getEmailSummary(),
            jobs: {
                status: 'not_configured',
                queueDepth: 0,
            },
            socket: {
                status: req.app.get('io') ? 'ready' : 'not_configured',
                connectedClients: req.app.get('io')?.engine?.clientsCount || 0,
            },
            deploy: {
                version: process.env.APP_VERSION || pkg.version,
                commit: process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
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
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const query = await buildUserQuery(req);
        const sort = buildUserSort(req);

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password -resetPasswordToken -resetPasswordExpire')
                .sort(sort)
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
        handleAdminError(res, error);
    }
};

/**
 * @desc    Export filtered users as CSV
 * @route   GET /api/admin/users/export
 */
const exportUsersCsv = async (req, res) => {
    try {
        const query = await buildUserQuery(req);
        const sort = buildUserSort(req);
        const users = await User.find(query)
            .select('name email role status createdAt lastLogin onboardingCompleted onboardingSkipped googleId microsoftId')
            .sort(sort)
            .limit(5000);

        const rows = [
            ['Name', 'Email', 'Role', 'Status', 'Created At', 'Last Login', 'Onboarding', 'OAuth Provider'],
            ...users.map((user) => [
                user.name,
                user.email,
                user.role,
                user.status,
                user.createdAt?.toISOString(),
                user.lastLogin?.toISOString() || '',
                user.onboardingCompleted ? 'completed' : user.onboardingSkipped ? 'skipped' : 'incomplete',
                user.googleId ? 'google' : user.microsoftId ? 'microsoft' : 'password',
            ]),
        ];

        const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="taskkollecta-users.csv"');
        res.send(csv);
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Get admin audit logs
 * @route   GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const action = req.query.action;
        const search = String(req.query.search || '').trim();

        const query = {};
        if (action && action !== 'all') query.action = action;
        if (search) {
            query.$or = [
                { action: { $regex: search, $options: 'i' } },
                { reason: { $regex: search, $options: 'i' } },
                { correlationId: { $regex: search, $options: 'i' } },
            ];
        }

        const [logs, total] = await Promise.all([
            AdminAuditLog.find(query)
                .populate('actor', 'name email role')
                .populate('target', 'name email role status')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            AdminAuditLog.countDocuments(query),
        ]);

        res.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        handleAdminError(res, error);
    }
};

const getRetentionSettings = async (_req, res) => {
    const settings = await RetentionSettings.findOneAndUpdate(
        { key: 'global' },
        { $setOnInsert: { key: 'global' } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    ).populate('updatedBy', 'name email');
    res.json(settings);
};

const updateRetentionSettings = async (req, res) => {
    try {
        const reason = requireReason(req.body.reason);
        const fields = ['auditLogDays', 'productEventDays', 'inactiveUserDays', 'deletedUserTombstoneDays'];
        const update = { updatedBy: req.user._id };
        fields.forEach((field) => {
            if (req.body[field] !== undefined) update[field] = Math.max(1, Number(req.body[field]));
        });
        const before = await RetentionSettings.findOne({ key: 'global' });
        const settings = await RetentionSettings.findOneAndUpdate(
            { key: 'global' },
            { $set: update },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        await createAdminAuditLog({
            req,
            action: 'compliance.retention_update',
            target: req.user._id,
            targetModel: 'RetentionSettings',
            reason,
            before: before?.toObject() || null,
            after: settings.toObject(),
        });
        res.json(settings);
    } catch (error) {
        handleAdminError(res, error);
    }
};

const getUserPrivacyExport = async (req, res) => {
    try {
        const reason = requireReason(req.query.reason || req.body.reason);
        const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpire');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const [memberships, projects, tasks, events, audits] = await Promise.all([
            Membership.find({ user: user._id }).populate('organization', 'name status'),
            Project.find({ $or: [{ lead: user._id }, { 'members.user': user._id }] }).select('name status organization createdAt'),
            Task.find({ $or: [{ reporter: user._id }, { assignee: user._id }] }).select('title status project organization createdAt'),
            ProductEvent.find({ user: user._id }).sort({ createdAt: -1 }).limit(500),
            AdminAuditLog.find({ $or: [{ actor: user._id }, { target: user._id }] }).sort({ createdAt: -1 }).limit(500),
        ]);

        user.privacyExportedAt = new Date();
        await user.save({ validateBeforeSave: false });
        await createAdminAuditLog({
            req,
            action: 'compliance.privacy_export',
            target: user,
            reason,
            before: pickUserAuditFields(user),
            after: { exportedAt: user.privacyExportedAt },
        });

        res.json({ user, memberships, projects, tasks, productEvents: events, adminAuditLogs: audits });
    } catch (error) {
        handleAdminError(res, error);
    }
};

const deleteUserPrivacyData = async (req, res) => {
    try {
        const reason = requireReason(req.body.reason);
        await verifyAdminPassword(req, req.body.currentPassword);
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'superadmin') return res.status(403).json({ message: 'Cannot privacy-delete a superadmin' });

        const before = pickUserAuditFields(user);
        user.name = 'Deleted User';
        user.email = `deleted-${user._id}@privacy.local`;
        user.avatar = '';
        user.googleId = undefined;
        user.microsoftId = undefined;
        user.status = 'banned';
        user.privacyDeletedAt = new Date();
        user.privacyDeleteReason = reason;
        user.loginHistory = [];
        user.failedLoginHistory = [];
        user.revokedSessions = [];
        await user.save({ validateBeforeSave: false });
        await createAdminAuditLog({
            req,
            action: 'compliance.privacy_delete',
            target: user,
            reason,
            before,
            after: pickUserAuditFields(user),
        });
        res.json({ message: 'User privacy deletion workflow completed', user });
    } catch (error) {
        handleAdminError(res, error);
    }
};

const getUserSupportTimeline = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpire');
        if (!user) return res.status(404).json({ message: 'User not found' });
        const [events, audits, activities] = await Promise.all([
            ProductEvent.find({ user: user._id }).sort({ createdAt: -1 }).limit(50),
            AdminAuditLog.find({ $or: [{ actor: user._id }, { target: user._id }] }).sort({ createdAt: -1 }).limit(50),
            Activity.find({ user: user._id }).sort({ createdAt: -1 }).limit(50).populate('project', 'name'),
        ]);
        const uniqueIps = new Set((user.loginHistory || []).map((entry) => entry.ip).filter(Boolean));
        const recentFailures = (user.failedLoginHistory || []).slice(-10);
        res.json({
            user,
            timeline: [
                ...events.map((event) => ({ type: 'product', at: event.createdAt, label: event.eventName, data: event })),
                ...audits.map((audit) => ({ type: 'audit', at: audit.createdAt, label: audit.action, data: audit })),
                ...activities.map((activity) => ({ type: 'activity', at: activity.createdAt, label: activity.action, data: activity })),
            ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 75),
            security: {
                failedLoginCount: user.failedLoginCount || 0,
                recentFailures,
                uniqueIpCount: uniqueIps.size,
                anomalyIndicators: [
                    ...(uniqueIps.size >= 3 ? ['multiple_recent_ips'] : []),
                    ...((user.failedLoginCount || 0) >= 5 ? ['elevated_failed_logins'] : []),
                ],
                sessions: (user.loginHistory || []).filter((entry) => entry.sessionId).slice(-10).reverse(),
            },
            consent: {
                termsAcceptedAt: user.termsAcceptedAt,
                termsVersion: user.termsVersion,
                privacyAcceptedAt: user.privacyAcceptedAt,
                privacyVersion: user.privacyVersion,
            },
        });
    } catch (error) {
        handleAdminError(res, error);
    }
};

const revokeUserSession = async (req, res) => {
    try {
        const reason = requireReason(req.body.reason);
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const sessionId = req.params.sessionId;
        user.revokedSessions.push({ sessionId, revokedBy: req.user._id, reason });
        user.loginHistory = (user.loginHistory || []).map((entry) => {
            if (entry.sessionId !== sessionId) return entry;
            const plain = entry.toObject ? entry.toObject() : entry;
            return { ...plain, revokedAt: new Date() };
        });
        await user.save({ validateBeforeSave: false });
        await createAdminAuditLog({
            req,
            action: 'support.session_revoke',
            target: user,
            reason,
            before: { sessionId },
            after: { sessionId, revokedAt: new Date() },
        });
        res.json({ message: 'Session revoked' });
    } catch (error) {
        handleAdminError(res, error);
    }
};

const getAnnouncementHistory = async (req, res) => {
    const announcements = await Announcement.find({})
        .populate('createdBy', 'name email')
        .populate('targetOrganizations', 'name')
        .sort({ createdAt: -1 })
        .limit(100);
    res.json({ announcements });
};

const getOrganizationSnapshot = async (organization) => ({
    _id: organization._id,
    name: organization.name,
    status: organization.status || 'active',
    createdBy: organization.createdBy,
    suspendedAt: organization.suspendedAt,
    suspensionReason: organization.suspensionReason,
});

/**
 * @desc    List organizations for tenant management
 * @route   GET /api/admin/organizations
 */
const getOrganizations = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const search = String(req.query.search || '').trim();
        const status = req.query.status;

        const query = {};
        if (search) query.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
        if (status && status !== 'all') query.status = status;

        const [organizations, total] = await Promise.all([
            Organization.find(query)
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Organization.countDocuments(query),
        ]);

        const orgIds = organizations.map((org) => org._id);
        const [memberCounts, projectCounts, taskCounts] = await Promise.all([
            Membership.aggregate([
                { $match: { organization: { $in: orgIds } } },
                { $group: { _id: '$organization', count: { $sum: 1 } } },
            ]),
            Project.aggregate([
                { $match: { organization: { $in: orgIds } } },
                { $group: { _id: '$organization', count: { $sum: 1 } } },
            ]),
            Project.aggregate([
                { $match: { organization: { $in: orgIds } } },
                {
                    $lookup: {
                        from: 'tasks',
                        localField: '_id',
                        foreignField: 'project',
                        as: 'tasks',
                    },
                },
                { $group: { _id: '$organization', count: { $sum: { $size: '$tasks' } } } },
            ]),
        ]);

        const toMap = (items) => new Map(items.map((item) => [item._id.toString(), item.count]));
        const memberMap = toMap(memberCounts);
        const projectMap = toMap(projectCounts);
        const taskMap = toMap(taskCounts);

        res.json({
            organizations: organizations.map((org) => ({
                ...org.toObject(),
                status: org.status || 'active',
                memberCount: memberMap.get(org._id.toString()) || 0,
                projectCount: projectMap.get(org._id.toString()) || 0,
                taskCount: taskMap.get(org._id.toString()) || 0,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Get tenant details
 * @route   GET /api/admin/organizations/:id
 */
const getOrganizationDetails = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id).populate('createdBy', 'name email');
        if (!organization) return res.status(404).json({ message: 'Organization not found' });

        const projects = await Project.find({ organization: organization._id }).select('_id name status createdAt updatedAt');
        const projectIds = projects.map((project) => project._id);
        const [members, taskCount, recentActivity, recentEvents] = await Promise.all([
            Membership.find({ organization: organization._id }).populate('user', 'name email avatar status role lastLogin'),
            Task.countDocuments({ project: { $in: projectIds } }),
            Activity.find({ project: { $in: projectIds } }).sort({ createdAt: -1 }).limit(10).populate('user', 'name email').populate('project', 'name'),
            ProductEvent.find({ organization: organization._id }).sort({ createdAt: -1 }).limit(10).populate('user', 'name email'),
        ]);

        const logoBytesEstimate = organization.logo ? 1 : 0;

        res.json({
            organization: {
                ...organization.toObject(),
                status: organization.status || 'active',
            },
            counts: {
                members: members.length,
                projects: projects.length,
                tasks: taskCount,
            },
            members,
            projects,
            activity: recentActivity,
            productEvents: recentEvents,
            storage: {
                status: 'limited',
                logoAssets: logoBytesEstimate,
                note: 'Upload byte tracking is not yet stored per tenant.',
            },
            health: {
                status: organization.status || 'active',
                hasOwner: members.some((membership) => membership.role === 'owner'),
                activeProjects: projects.filter((project) => project.status === 'active').length,
                lastActivityAt: recentActivity[0]?.createdAt || recentEvents[0]?.createdAt || null,
            },
        });
    } catch (error) {
        handleAdminError(res, error);
    }
};

const setOrganizationStatus = async (req, res, status) => {
    try {
        const reason = requireReason(req.body.reason);
        const organization = await Organization.findById(req.params.id);
        if (!organization) return res.status(404).json({ message: 'Organization not found' });

        const before = await getOrganizationSnapshot(organization);
        organization.status = status;
        if (status === 'suspended') {
            organization.suspendedAt = new Date();
            organization.suspensionReason = reason;
        }
        if (status === 'active') {
            organization.suspendedAt = undefined;
        }
        await organization.save();

        await createAdminAuditLog({
            req,
            action: status === 'suspended' ? 'organization.suspend' : 'organization.activate',
            target: organization._id,
            targetModel: 'Organization',
            reason,
            before,
            after: await getOrganizationSnapshot(organization),
        });

        res.json({ message: `Organization ${status}`, organization });
    } catch (error) {
        handleAdminError(res, error);
    }
};

const suspendOrganization = (req, res) => setOrganizationStatus(req, res, 'suspended');
const activateOrganization = (req, res) => setOrganizationStatus(req, res, 'active');

/**
 * @desc    Transfer organization ownership
 * @route   PUT /api/admin/organizations/:id/transfer-owner
 */
const transferOrganizationOwner = async (req, res) => {
    try {
        const reason = requireReason(req.body.reason);
        await verifyAdminPassword(req, req.body.currentPassword);

        const organization = await Organization.findById(req.params.id);
        if (!organization) return res.status(404).json({ message: 'Organization not found' });

        const newOwner = await User.findById(req.body.newOwnerId);
        if (!newOwner) return res.status(404).json({ message: 'New owner not found' });

        const before = await getOrganizationSnapshot(organization);
        await Membership.updateMany({ organization: organization._id, role: 'owner' }, { role: 'admin' });
        await Membership.findOneAndUpdate(
            { organization: organization._id, user: newOwner._id },
            { role: 'owner' },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        organization.createdBy = newOwner._id;
        await organization.save();

        await createAdminAuditLog({
            req,
            action: 'organization.owner_transfer',
            target: organization._id,
            targetModel: 'Organization',
            reason,
            before,
            after: {
                ...(await getOrganizationSnapshot(organization)),
                newOwner: {
                    _id: newOwner._id,
                    name: newOwner.name,
                    email: newOwner.email,
                },
            },
        });

        res.json({ message: 'Organization ownership transferred', organization });
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Suspend a user
 * @route   PUT /api/admin/users/:id/suspend
 */
const suspendUser = async (req, res) => {
    try {
        const reason = requireReason(req.body.reason);

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'Cannot suspend a superadmin' });
        }

        const before = pickUserAuditFields(user);
        user.status = 'suspended';
        user.suspendedAt = new Date();
        user.suspendReason = reason;
        await user.save();
        await createAdminAuditLog({
            req,
            action: 'user.suspend',
            target: user,
            reason,
            before,
            after: pickUserAuditFields(user),
        });

        res.json({ message: 'User suspended successfully', user });
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Ban a user
 * @route   PUT /api/admin/users/:id/ban
 */
const banUser = async (req, res) => {
    try {
        const reason = requireReason(req.body.reason);
        await verifyAdminPassword(req, req.body.currentPassword);

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'Cannot ban a superadmin' });
        }

        const before = pickUserAuditFields(user);
        user.status = 'banned';
        user.bannedAt = new Date();
        user.banReason = reason;
        await user.save();
        await createAdminAuditLog({
            req,
            action: 'user.ban',
            target: user,
            reason,
            before,
            after: pickUserAuditFields(user),
        });

        res.json({ message: 'User banned successfully', user });
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Activate a user (remove suspension/ban)
 * @route   PUT /api/admin/users/:id/activate
 */
const activateUser = async (req, res) => {
    try {
        const reason = requireReason(req.body.reason);
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const before = pickUserAuditFields(user);
        user.status = 'active';
        user.suspendedAt = undefined;
        user.bannedAt = undefined;
        await user.save();
        await createAdminAuditLog({
            req,
            action: 'user.activate',
            target: user,
            reason,
            before,
            after: pickUserAuditFields(user),
        });

        res.json({ message: 'User activated successfully', user });
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Reset user password (admin action)
 * @route   POST /api/admin/users/:id/reset-password
 */
const adminResetPassword = async (req, res) => {
    try {
        const reason = requireReason(req.body.reason);
        await verifyAdminPassword(req, req.body.currentPassword);

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const before = pickUserAuditFields(user);
        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        await sendEmail({
            email: user.email,
            subject: 'Password Reset Requested by Support',
            message: `
        <h2>Password Reset by Administrator</h2>
        <p>An administrator requested a password reset for your account.</p>
        <p>Use the secure link below to set a new password. This link expires in 10 minutes.</p>
        <a href="${resetUrl}" clicktracking=off style="display:inline-block; margin-top:10px; background: #6366f1; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      `
        });
        await createAdminAuditLog({
            req,
            action: 'user.password_reset_link',
            target: user,
            reason,
            before,
            after: {
                ...pickUserAuditFields(user),
                resetPasswordExpire: user.resetPasswordExpire,
            },
        });

        res.json({ message: 'Password reset link sent to user' });
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Change user role
 * @route   PUT /api/admin/users/:id/role
 */
const changeUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const reason = requireReason(req.body.reason);
        await verifyAdminPassword(req, req.body.currentPassword);

        if (!['user', 'admin', 'superadmin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await ensureNotLastActiveSuperadmin(user, role);

        const before = pickUserAuditFields(user);
        user.role = role;
        await user.save();
        await createAdminAuditLog({
            req,
            action: 'user.role_change',
            target: user,
            reason,
            before,
            after: pickUserAuditFields(user),
        });

        res.json({ message: `User role changed to ${role}`, user });
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Create a global announcement
 * @route   POST /api/admin/announcements
 */
const createAnnouncement = async (req, res) => {
    try {
        const { message, type, startsAt, expiresAt, targetRoles = [], targetOrganizations = [] } = req.body;
        const reason = requireReason(req.body.reason);
        
        const announcement = await Announcement.create({
            message,
            type,
            createdBy: req.user._id,
            isActive: true,
            startsAt: startsAt ? new Date(startsAt) : undefined,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            targetRoles,
            targetOrganizations,
        });
        await createAdminAuditLog({
            req,
            action: 'announcement.create',
            target: announcement._id,
            targetModel: 'Announcement',
            reason,
            before: null,
            after: announcement.toObject(),
        });

        // Broadcast to all connected clients
        const isLiveNow = (!announcement.startsAt || announcement.startsAt <= new Date())
            && (!announcement.expiresAt || announcement.expiresAt > new Date());
        if (req.io && isLiveNow) {
            req.io.emit('new_announcement', announcement);
        }

        res.status(201).json(announcement);
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Dismiss a global announcement
 * @route   PUT /api/admin/announcements/:id/dismiss
 */
const dismissAnnouncement = async (req, res) => {
    try {
        const reason = requireReason(req.body.reason);
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        const before = announcement.toObject();
        announcement.isActive = false;
        announcement.dismissedAt = new Date();
        await announcement.save();
        await createAdminAuditLog({
            req,
            action: 'announcement.dismiss',
            target: announcement._id,
            targetModel: 'Announcement',
            reason,
            before,
            after: announcement.toObject(),
        });

        req.app.get('io').emit('announcement_dismissed', { id: announcement._id });

        res.json({ message: 'Announcement dismissed' });
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Get extended details for a specific user
 * @route   GET /api/admin/users/:id/details
 */
const getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpire');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get specialized data for the drawer
        const [memberships, projects, recentActivity] = await Promise.all([
            Membership.find({ user: user._id }).populate('organization', 'name'),
            Project.find({ 'members.user': user._id }).select('name status'),
            Activity.find({ user: user._id }).sort({ createdAt: -1 }).limit(10).populate('project', 'name')
        ]);

        res.json({
            user,
            organizations: memberships.map(m => m.organization),
            projects,
            recentActivity
        });
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Impersonate a user (SuperAdmin only)
 * @route   POST /api/admin/users/:id/impersonate
 */
const impersonateUser = async (req, res) => {
    try {
        const reason = requireReason(req.body.reason);
        await verifyAdminPassword(req, req.body.currentPassword);

        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (targetUser.role === 'superadmin') {
            return res.status(403).json({ message: 'Cannot impersonate a superadmin' });
        }
        if (targetUser.status !== 'active') {
            return res.status(403).json({ message: 'Only active users can be impersonated' });
        }

        const token = generateToken(res, targetUser._id, {
            expiresIn: '15m',
            maxAge: 15 * 60 * 1000,
            payload: {
                impersonatedBy: req.user._id.toString(),
                impersonationStartedAt: new Date().toISOString(),
            },
        });
        await createAdminAuditLog({
            req,
            action: 'user.impersonate_start',
            target: targetUser,
            reason,
            before: pickUserAuditFields(targetUser),
            after: {
                ...pickUserAuditFields(targetUser),
                impersonatedBy: req.user._id,
                expiresInMinutes: 15,
            },
        });

        res.json({
            _id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            avatar: targetUser.avatar,
            role: targetUser.role,
            onboardingCompleted: targetUser.onboardingCompleted,
            token,
            isImpersonated: true,
            impersonatedBy: {
                _id: req.user._id,
                name: req.user.name,
                email: req.user.email,
            },
            impersonationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
    } catch (error) {
        handleAdminError(res, error);
    }
};

/**
 * @desc    Return from an impersonated session to the original superadmin
 * @route   POST /api/admin/impersonation/return
 */
const returnFromImpersonation = async (req, res) => {
    try {
        if (!req.impersonation?.impersonatedBy) {
            return res.status(400).json({ message: 'Current session is not impersonated' });
        }

        const admin = await User.findById(req.impersonation.impersonatedBy);
        if (!admin || admin.role !== 'superadmin' || admin.status !== 'active') {
            return res.status(403).json({ message: 'Original superadmin session is no longer valid' });
        }

        const targetUser = req.user;
        const token = generateToken(res, admin._id);
        req.user = admin;
        await createAdminAuditLog({
            req,
            action: 'user.impersonate_return',
            target: targetUser,
            reason: 'Returned from impersonation session',
            before: {
                ...pickUserAuditFields(targetUser),
                impersonatedBy: admin._id,
            },
            after: pickUserAuditFields(admin),
        });

        res.json({
            _id: admin.id,
            name: admin.name,
            email: admin.email,
            avatar: admin.avatar,
            role: admin.role,
            onboardingCompleted: admin.onboardingCompleted,
            token,
        });
    } catch (error) {
        handleAdminError(res, error);
    }
};

module.exports = {
    getDashboardStats,
    getSystemHealth,
    getAllUsers,
    exportUsersCsv,
    getAuditLogs,
    getRetentionSettings,
    updateRetentionSettings,
    getUserPrivacyExport,
    deleteUserPrivacyData,
    getUserSupportTimeline,
    revokeUserSession,
    getAnnouncementHistory,
    getOrganizations,
    getOrganizationDetails,
    suspendOrganization,
    activateOrganization,
    transferOrganizationOwner,
    suspendUser,
    banUser,
    activateUser,
    adminResetPassword,
    changeUserRole,
    createAnnouncement,
    dismissAnnouncement,
    getUserDetails,
    impersonateUser,
    returnFromImpersonation
};
