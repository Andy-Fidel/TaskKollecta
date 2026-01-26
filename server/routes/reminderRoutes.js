const express = require('express');
const router = express.Router();
const { getReminders, createReminder, updateReminder, deleteReminder } = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');
const { validateReminder, validateIdParam } = require('../middleware/validators');

router.use(protect);

router.route('/')
    .get(getReminders)
    .post(validateReminder, createReminder);

router.route('/:id')
    .put(validateIdParam, updateReminder)
    .delete(validateIdParam, deleteReminder);

module.exports = router;
