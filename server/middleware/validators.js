const { body, param, validationResult } = require('express-validator');

// Generic handler to check validation results
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
};

// --- USER VALIDATORS ---
const validateRegister = [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    handleValidation
];

const validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidation
];

// --- TASK VALIDATORS ---
const validateCreateTask = [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
    body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description too long'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']).withMessage('Invalid status'),
    body('projectId').isMongoId().withMessage('Invalid project ID'),
    body('orgId').isMongoId().withMessage('Invalid organization ID'),
    handleValidation
];

const validateUpdateTask = [
    param('id').isMongoId().withMessage('Invalid task ID'),
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 5000 }),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']),
    handleValidation
];

// --- PROJECT VALIDATORS ---
const validateCreateProject = [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('orgId').isMongoId().withMessage('Invalid organization ID'),
    handleValidation
];

// --- COMMENT VALIDATORS ---
const validateComment = [
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters'),
    body('taskId').isMongoId().withMessage('Invalid task ID'),
    handleValidation
];

// --- REMINDER VALIDATORS ---
const validateReminder = [
    body('title').trim().isLength({ min: 1, max: 300 }).withMessage('Title must be 1-300 characters'),
    body('tag').optional().trim().isLength({ max: 50 }),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('dueDate').isISO8601().withMessage('Invalid date format'),
    handleValidation
];

// --- GENERIC ID PARAM ---
const validateIdParam = [
    param('id').isMongoId().withMessage('Invalid ID'),
    handleValidation
];

module.exports = {
    validateRegister,
    validateLogin,
    validateCreateTask,
    validateUpdateTask,
    validateCreateProject,
    validateComment,
    validateReminder,
    validateIdParam
};
