const Task = require('../models/Task');
const Automation = require('../models/Automation');
const runAutomations = require('./automationEngine');

/**
 * Check for overdue tasks and fire 'task_overdue' automations.
 * Should be called periodically (e.g. every hour via setInterval or cron).
 *
 * For each project that has active task_overdue rules,
 * find tasks that are past due and not done/archived, then run automations.
 */
async function checkOverdueTasks(io) {
  try {
    // Find all projects that have active overdue rules
    const overdueRules = await Automation.find({
      triggerType: 'task_overdue',
      isActive: true
    }).distinct('project');

    if (overdueRules.length === 0) return;

    const now = new Date();

    // For each project with overdue rules, find overdue tasks
    for (const projectId of overdueRules) {
      const overdueTasks = await Task.find({
        project: projectId,
        dueDate: { $lt: now },
        status: { $ne: 'done' },
        archived: { $ne: true },
        // Avoid re-triggering: only tasks that haven't been flagged yet
        _overdueNotified: { $ne: true }
      }).populate('assignee', 'name email');

      for (const task of overdueTasks) {
        await runAutomations(projectId, 'task_overdue', 'any', task, { io });

        // Mark task so we don't re-trigger next cycle
        await Task.updateOne(
          { _id: task._id },
          { $set: { _overdueNotified: true } }
        );
      }

      if (overdueTasks.length > 0) {
        console.log(`⏰ Overdue scheduler: processed ${overdueTasks.length} tasks in project ${projectId}`);
      }
    }
  } catch (error) {
    console.error('❌ Overdue scheduler error:', error);
  }
}

/**
 * Start the overdue task check on a 1-hour interval.
 * No external dependency needed — uses plain setInterval.
 */
function startOverdueScheduler(io) {
  // Run immediately on startup
  checkOverdueTasks(io);

  // Then every hour
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => checkOverdueTasks(io), ONE_HOUR);

  console.log('⏰ Overdue task scheduler started (hourly)');
}

module.exports = { startOverdueScheduler, checkOverdueTasks };
