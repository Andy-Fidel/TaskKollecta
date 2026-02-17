const express = require('express');
const router = express.Router();
const { createTask,
    getProjectTasks,
    getTask,
    updateTask,
    getMyTasks,
    deleteTask,
    addAttachment,
    deleteAttachment,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addDependency,
    removeDependency,
    toggleArchiveTask,
    addTag,
    removeTag,
    setRecurrence,
    removeRecurrence } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const { validateCreateTask, validateUpdateTask, validateIdParam } = require('../middleware/validators');
const { cacheResponse } = require('../middleware/cacheMiddleware');


router.post('/', protect, validateCreateTask, createTask);
router.get('/my-tasks', protect, cacheResponse(60), getMyTasks);
router.get('/project/:projectId', protect, cacheResponse(60), getProjectTasks);
router.put('/:id', protect, validateUpdateTask, updateTask);
router.delete('/:id', protect, validateIdParam, deleteTask);
router.post('/:id/attachments', protect, addAttachment);
router.delete('/:id/attachments/:attachmentId', protect, deleteAttachment);
router.get('/single/:id', protect, cacheResponse(30), getTask);
router.put('/:id/archive', protect, toggleArchiveTask);

// Subtasks
router.post('/:id/subtasks', protect, addSubtask);
router.put('/:id/subtasks/:subtaskId', protect, toggleSubtask);
router.delete('/:id/subtasks/:subtaskId', protect, deleteSubtask);

// Dependencies
router.post('/:id/dependencies', protect, addDependency);
router.delete('/:id/dependencies/:dependencyId', protect, removeDependency);

// Tags
router.post('/:id/tags', protect, addTag);
router.delete('/:id/tags/:tagId', protect, removeTag);

// Recurrence
router.put('/:id/recurrence', protect, setRecurrence);
router.delete('/:id/recurrence', protect, removeRecurrence);

module.exports = router;