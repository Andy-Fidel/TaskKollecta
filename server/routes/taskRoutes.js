const express = require('express');
const router = express.Router();
const { createTask, 
    getProjectTasks,
    getTask,
    updateTask,
    getMyTasks,
    deleteTask,
    addAttachment,
    addSubtask, 
    toggleSubtask, 
    deleteSubtask, 
    addDependency, 
    removeDependency, 
    toggleArchiveTask } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');


router.post('/', protect, createTask);
router.get('/my-tasks', protect, getMyTasks);
router.get('/project/:projectId', protect, getProjectTasks);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);
router.post('/:id/attachments', protect, addAttachment);
router.get('/single/:id', protect, getTask);
router.put('/:id/archive', protect, toggleArchiveTask);

// Subtasks
router.post('/:id/subtasks', protect, addSubtask);
router.put('/:id/subtasks/:subtaskId', protect, toggleSubtask);
router.delete('/:id/subtasks/:subtaskId', protect, deleteSubtask);

// Dependencies
router.post('/:id/dependencies', protect, addDependency);
router.delete('/:id/dependencies/:dependencyId', protect, removeDependency);

module.exports = router;