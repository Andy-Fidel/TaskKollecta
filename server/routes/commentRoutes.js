const express = require('express');
const router = express.Router();
const { addComment, getTaskComments } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');
const { validateComment, validateIdParam } = require('../middleware/validators');

router.post('/', protect, validateComment, addComment);
router.get('/:taskId', protect, validateIdParam, getTaskComments);

module.exports = router;