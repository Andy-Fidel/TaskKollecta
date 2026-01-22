const Reminder = require('../models/Reminder');

// @desc    Get user's reminders
// @route   GET /api/reminders
const getReminders = async (req, res) => {
    try {
        const reminders = await Reminder.find({ user: req.user._id, completed: false })
            .sort({ dueDate: 1 }) // Soonest first
            .limit(10);
        res.json(reminders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create reminder
// @route   POST /api/reminders
const createReminder = async (req, res) => {
    const { title, tag, priority, dueDate } = req.body;
    try {
        const reminder = await Reminder.create({
            user: req.user._id,
            title,
            tag,
            priority,
            dueDate
        });
        res.status(201).json(reminder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark reminder as complete (or update)
// @route   PUT /api/reminders/:id
const updateReminder = async (req, res) => {
    try {
        const reminder = await Reminder.findById(req.params.id);
        if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
        if (reminder.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });

        const updated = await Reminder.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
const deleteReminder = async (req, res) => {
    try {
        const reminder = await Reminder.findById(req.params.id);
        if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
        if (reminder.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });

        await Reminder.deleteOne({ _id: req.params.id });
        res.json({ message: 'Reminder deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getReminders, createReminder, updateReminder, deleteReminder };
