const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isSuperAdmin } = require('../middleware/adminMiddleware');
const {
    getDashboardStats,
    getSystemHealth,
    getAllUsers,
    suspendUser,
    banUser,
    activateUser,
    adminResetPassword,
    changeUserRole
} = require('../controllers/adminController');

// All routes require authentication + superadmin role
router.use(protect, isSuperAdmin);

// Dashboard
router.get('/stats', getDashboardStats);
router.get('/health', getSystemHealth);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/activate', activateUser);
router.post('/users/:id/reset-password', adminResetPassword);
router.put('/users/:id/role', changeUserRole);

module.exports = router;
