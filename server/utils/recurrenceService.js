const Task = require('../models/Task');

/**
 * Calculate the next due date based on recurrence pattern
 */
function calculateNextDueDate(currentDate, recurrence) {
    const next = new Date(currentDate);
    const interval = recurrence.interval || 1;

    switch (recurrence.pattern) {
        case 'daily':
            next.setDate(next.getDate() + interval);
            break;
        case 'weekly':
            next.setDate(next.getDate() + (7 * interval));
            break;
        case 'biweekly':
            next.setDate(next.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + interval);
            break;
        default:
            next.setDate(next.getDate() + 7); // Default to weekly
    }

    return next;
}

/**
 * Generate the next instance of a recurring task
 */
async function generateNextInstance(parentTask) {
    // Check if recurrence is enabled and valid
    if (!parentTask.recurrence?.enabled) return null;

    // Check if we've passed the end date
    if (parentTask.recurrence.endDate && new Date() > new Date(parentTask.recurrence.endDate)) {
        return null;
    }

    const nextDueDate = calculateNextDueDate(
        parentTask.dueDate || new Date(),
        parentTask.recurrence
    );

    // Check if next due date is past end date
    if (parentTask.recurrence.endDate && nextDueDate > new Date(parentTask.recurrence.endDate)) {
        return null;
    }

    // Create new task instance
    const newTask = await Task.create({
        title: parentTask.title,
        description: parentTask.description,
        status: 'todo', // Always start fresh
        priority: parentTask.priority,
        dueDate: nextDueDate,
        organization: parentTask.organization,
        project: parentTask.project,
        assignee: parentTask.assignee,
        reporter: parentTask.reporter,
        tags: parentTask.tags,
        parentTask: parentTask._id,
        recurrence: {
            enabled: true,
            pattern: parentTask.recurrence.pattern,
            interval: parentTask.recurrence.interval,
            daysOfWeek: parentTask.recurrence.daysOfWeek,
            endDate: parentTask.recurrence.endDate,
        }
    });

    // Update parent's lastGenerated
    await Task.findByIdAndUpdate(parentTask._id, {
        'recurrence.lastGenerated': new Date()
    });

    return newTask;
}

/**
 * Process all recurring tasks that need new instances
 * Call this periodically (e.g., daily cron job)
 */
async function processRecurringTasks() {
    const now = new Date();

    // Find recurring tasks where:
    // 1. Recurrence is enabled
    // 2. Status is 'done' (completed)
    // 3. No child task exists for next period OR lastGenerated is old enough
    const recurringTasks = await Task.find({
        'recurrence.enabled': true,
        status: 'done',
        $or: [
            { 'recurrence.lastGenerated': { $exists: false } },
            { 'recurrence.lastGenerated': { $lt: now } }
        ]
    });

    const generatedTasks = [];

    for (const task of recurringTasks) {
        // Check if a child task already exists for the next period
        const existingChild = await Task.findOne({
            parentTask: task._id,
            dueDate: { $gt: task.dueDate }
        });

        if (!existingChild) {
            const newTask = await generateNextInstance(task);
            if (newTask) {
                generatedTasks.push(newTask);
            }
        }
    }

    return generatedTasks;
}

/**
 * Set or update recurrence for a task
 */
async function setTaskRecurrence(taskId, recurrenceData) {
    const task = await Task.findByIdAndUpdate(
        taskId,
        {
            recurrence: {
                enabled: recurrenceData.enabled !== false,
                pattern: recurrenceData.pattern || 'weekly',
                interval: recurrenceData.interval || 1,
                daysOfWeek: recurrenceData.daysOfWeek || [],
                endDate: recurrenceData.endDate || null,
                lastGenerated: null
            }
        },
        { new: true }
    );

    return task;
}

/**
 * Remove recurrence from a task
 */
async function removeTaskRecurrence(taskId) {
    const task = await Task.findByIdAndUpdate(
        taskId,
        {
            recurrence: {
                enabled: false,
                pattern: 'weekly',
                interval: 1,
                daysOfWeek: [],
                endDate: null,
                lastGenerated: null
            }
        },
        { new: true }
    );

    return task;
}

module.exports = {
    calculateNextDueDate,
    generateNextInstance,
    processRecurringTasks,
    setTaskRecurrence,
    removeTaskRecurrence
};
