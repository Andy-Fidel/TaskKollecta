const express = require('express');
const router = express.Router();
const { createTask, getProjectTasks, updateTask, getMyTasks, deleteTask } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createTask);
router.get('/my-tasks', protect, getMyTasks);
router.get('/project/:projectId', protect, getProjectTasks);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);


module.exports = router;