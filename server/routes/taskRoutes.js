const express = require('express');
const router = express.Router();
const { createTask, 
    getProjectTasks,
    updateTask,
    getMyTasks,
    deleteTask,
    addAttachment,
    addSubtask, toggleSubtask, deleteSubtask, addDependency, removeDependency } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
console.log({ 
    deleteSubtask, 
    removeDependency, 
    deleteTask 
});

router.post('/', protect, createTask);
router.get('/my-tasks', protect, getMyTasks);
router.get('/project/:projectId', protect, getProjectTasks);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);
router.post('/:id/attachments', protect, addAttachment);

// Subtasks
router.post('/:id/subtasks', protect, addSubtask);
router.put('/:id/subtasks/:subtaskId', protect, toggleSubtask);
router.delete('/:id/subtasks/:subtaskId', protect, deleteSubtask);

// Dependencies
router.post('/:id/dependencies', protect, addDependency);
router.delete('/:id/dependencies/:dependencyId', protect, removeDependency);

module.exports = router;