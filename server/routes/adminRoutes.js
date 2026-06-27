const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isSuperAdmin } = require('../middleware/adminMiddleware');
const {
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
} = require('../controllers/adminController');

router.post('/impersonation/return', protect, returnFromImpersonation);

// All routes require authentication + superadmin role
router.use(protect, isSuperAdmin);

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/health', getSystemHealth);
router.get('/audit-logs', getAuditLogs);
router.get('/retention-settings', getRetentionSettings);
router.put('/retention-settings', updateRetentionSettings);
router.get('/announcements', getAnnouncementHistory);

// User Management
router.get('/users/export', exportUsersCsv);
router.get('/users', getAllUsers);
router.get('/users/:id/privacy-export', getUserPrivacyExport);
router.post('/users/:id/privacy-delete', deleteUserPrivacyData);
router.get('/users/:id/support-timeline', getUserSupportTimeline);
router.post('/users/:id/sessions/:sessionId/revoke', revokeUserSession);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/activate', activateUser);
router.post('/users/:id/reset-password', adminResetPassword);
router.put('/users/:id/role', changeUserRole);
router.get('/users/:id/details', getUserDetails);
router.post('/users/:id/impersonate', impersonateUser);

// Organization Management
router.get('/organizations', getOrganizations);
router.get('/organizations/:id', getOrganizationDetails);
router.put('/organizations/:id/suspend', suspendOrganization);
router.put('/organizations/:id/activate', activateOrganization);
router.put('/organizations/:id/transfer-owner', transferOrganizationOwner);

// Announcements
router.post('/announcements', createAnnouncement);
router.put('/announcements/:id/dismiss', dismissAnnouncement);

module.exports = router;
