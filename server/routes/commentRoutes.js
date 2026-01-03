const express = require('express');
const router = express.Router();
const { addComment, getTaskComments } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, addComment);
router.get('/:taskId', protect, getTaskComments);

module.exports = router;