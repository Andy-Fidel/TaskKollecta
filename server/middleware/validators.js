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

const validateOnboarding = [
    body('role').optional().isIn(['personal', 'team_lead', 'manager']).withMessage('Invalid onboarding role'),
    body('teamSize').optional().trim().isLength({ max: 50 }).withMessage('Team size must be 50 characters or fewer'),
    body('goals').optional().isArray({ max: 10 }).withMessage('Goals must be a list of 10 or fewer items'),
    body('goals.*').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Each goal must be 1-100 characters'),
    body('organizationName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Workspace name must be 1-100 characters'),
    body('projectName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Project name must be 1-100 characters'),
    body('inviteEmails').optional().isArray({ max: 20 }).withMessage('Maximum 20 invites at a time'),
    body('inviteEmails.*').optional({ values: 'falsy' }).isEmail().normalizeEmail().withMessage('Invalid invite email'),
    body('skipped').optional().isBoolean().withMessage('Skipped must be true or false'),
    body('skipStep').optional().isInt({ min: 0, max: 20 }).withMessage('Invalid skip step'),
    handleValidation
];

const validateOnboardingProgress = [
    body('currentStep').optional().isInt({ min: 0, max: 20 }).withMessage('Invalid onboarding step'),
    body('role').optional({ values: 'falsy' }).isIn(['personal', 'team_lead', 'manager']).withMessage('Invalid onboarding role'),
    body('organizationName').optional().trim().isLength({ max: 100 }).withMessage('Workspace name must be 100 characters or fewer'),
    body('projectName').optional().trim().isLength({ max: 100 }).withMessage('Project name must be 100 characters or fewer'),
    body('inviteEmails').optional().isArray({ max: 20 }).withMessage('Maximum 20 invites at a time'),
    body('inviteEmails.*').optional({ values: 'falsy' }).isEmail().normalizeEmail().withMessage('Invalid invite email'),
    handleValidation
];

// --- TASK VALIDATORS ---
const validateCreateTask = [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
    body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description too long'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('status').optional().trim().isLength({ min: 1, max: 80 }).withMessage('Invalid status'),
    body('index').optional().isNumeric().withMessage('Invalid task index'),
    body('dependencies').optional().isArray({ max: 50 }).withMessage('Dependencies must be a list'),
    body('dependencies.*').optional().isMongoId().withMessage('Invalid dependency ID'),
    body('subtasks').optional().isArray({ max: 25 }).withMessage('Subtasks must be a list'),
    body('subtasks.*.title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Subtask title must be 1-200 characters'),
    body('projectId').isMongoId().withMessage('Invalid project ID'),
    body('orgId').isMongoId().withMessage('Invalid organization ID'),
    handleValidation
];

const validateUpdateTask = [
    param('id').isMongoId().withMessage('Invalid task ID'),
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 5000 }),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('status').optional().trim().isLength({ min: 1, max: 80 }),
    body('index').optional().isNumeric().withMessage('Invalid task index'),
    handleValidation
];

// --- PROJECT VALIDATORS ---
const validateCreateProject = [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('orgId').isMongoId().withMessage('Invalid organization ID'),
    body('lead').optional().isMongoId().withMessage('Invalid lead ID'),
    body('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid start date'),
    body('dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid due date'),
    body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Invalid color'),
    body('defaultView').optional().isIn(['list', 'board', 'timeline', 'calendar']).withMessage('Invalid default view'),
    body('privacy').optional().isIn(['public', 'private']).withMessage('Invalid privacy setting'),
    body('brief.purpose').optional().trim().isLength({ max: 2000 }).withMessage('Project purpose is too long'),
    body('brief.successCriteria').optional().trim().isLength({ max: 2000 }).withMessage('Success criteria is too long'),
    body('brief.statusCadence').optional().isIn(['none', 'weekly', 'biweekly', 'monthly']).withMessage('Invalid status cadence'),
    body('brief.resources').optional().isArray({ max: 20 }).withMessage('Resources must be a list'),
    body('brief.resources.*.label').optional().trim().isLength({ min: 1, max: 120 }).withMessage('Resource label must be 1-120 characters'),
    body('brief.resources.*.url').optional().isURL({ require_protocol: true }).withMessage('Resource URL must include http:// or https://'),
    body('brief.milestones').optional().isArray({ max: 25 }).withMessage('Milestones must be a list'),
    body('brief.milestones.*.title').optional().trim().isLength({ min: 1, max: 160 }).withMessage('Milestone title must be 1-160 characters'),
    body('brief.milestones.*.dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid milestone due date'),
    body('members').optional().isArray({ max: 100 }).withMessage('Members must be a list'),
    body('members.*').optional().isMongoId().withMessage('Invalid member ID'),
    body('portfolioIds').optional().isArray({ max: 25 }).withMessage('Portfolio IDs must be a list'),
    body('portfolioIds.*').optional().isMongoId().withMessage('Invalid portfolio ID'),
    body('seedTasks').optional().isArray({ max: 100 }).withMessage('Seed tasks must be a list'),
    body('seedTasks.*.title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Seed task title must be 1-200 characters'),
    body('seedTasks.*.description').optional().trim().isLength({ max: 5000 }).withMessage('Seed task description too long'),
    body('seedTasks.*.priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid seed task priority'),
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
    validateOnboarding,
    validateOnboardingProgress,
    validateCreateTask,
    validateUpdateTask,
    validateCreateProject,
    validateComment,
    validateReminder,
    validateIdParam
};
