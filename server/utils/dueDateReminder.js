/**
 * Due Date Reminder Service
 * Sends email reminders for tasks due soon
 * 
 * This can be called via:
 * - Render Cron Job: https://docs.render.com/cronjobs
 * - External scheduler: Call GET /api/cron/due-reminders with API key
 * - Manual trigger for testing
 */

const Task = require('../models/Task');
const Project = require('../models/Project');
const { sendDueDateReminderEmail } = require('./notificationService');

/**
 * Find tasks due within X days and send reminders
 * @param {number} daysAhead - Number of days to look ahead (default: 1)
 */
const sendDueDateReminders = async (daysAhead = 1) => {
    console.log(`📧 Running due date reminder check for tasks due in ${daysAhead} day(s)...`);

    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysAhead);
        targetDate.setHours(23, 59, 59, 999);

        // Start of target day
        const startOfDay = new Date(now);
        startOfDay.setDate(startOfDay.getDate() + daysAhead);
        startOfDay.setHours(0, 0, 0, 0);

        // Find tasks due on the target day
        const tasks = await Task.find({
            dueDate: {
                $gte: startOfDay,
                $lte: targetDate
            },
            status: { $ne: 'done' },
            archived: { $ne: true },
            assignee: { $exists: true, $ne: null }
        }).populate('project', 'name');

        console.log(`Found ${tasks.length} tasks due in ${daysAhead} day(s)`);

        let sentCount = 0;
        for (const task of tasks) {
            try {
                await sendDueDateReminderEmail(task.assignee, {
                    task,
                    projectName: task.project?.name || 'General',
                    projectId: task.project?._id || task.project,
                    daysUntilDue: daysAhead
                });
                sentCount++;
            } catch (error) {
                console.error(`Failed to send reminder for task ${task._id}:`, error.message);
            }
        }

        console.log(`✅ Sent ${sentCount} due date reminders`);
        return { sent: sentCount, total: tasks.length };
    } catch (error) {
        console.error('❌ Due date reminder job failed:', error);
        throw error;
    }
};

/**
 * Run reminders for multiple timeframes
 * - Today (0 days)
 * - Tomorrow (1 day)
 * - 3 days out
 */
const runAllReminders = async () => {
    const results = {
        today: await sendDueDateReminders(0),
        tomorrow: await sendDueDateReminders(1),
        threeDays: await sendDueDateReminders(3)
    };

    console.log('📊 Reminder summary:', results);
    return results;
};

module.exports = {
    sendDueDateReminders,
    runAllReminders
};
