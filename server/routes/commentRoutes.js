const express = require('express');
const router = express.Router();
const { addComment, getTaskComments } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');
const { validateComment } = require('../middleware/validators');
const { param } = require('express-validator');

// Custom validator for taskId param
const validateTaskIdParam = [
  param('taskId').isMongoId().withMessage('Invalid task ID'),
  (req, res, next) => {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }
    next();
  }
];

router.post('/', protect, validateComment, addComment);
router.get('/:taskId', protect, validateTaskIdParam, getTaskComments);

module.exports = router;