const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('./sendEmail');
const {
  taskAssignmentTemplate,
  newCommentTemplate,
  dueDateReminderTemplate,
  taskStatusChangeTemplate,
  mentionTemplate
} = require('./emailTemplates');

// Simple in-memory queue for retries
const emailQueue = [];
let isProcessing = false;

/**
 * Send in-app notification via Socket.io
 */
const sendNotification = async (io, { recipientId, senderId, type, relatedId, relatedModel, message }) => {
  try {
    // Don't notify yourself
    if (recipientId.toString() === senderId.toString()) return;

    // Create in DB
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      relatedId,
      relatedModel,
      message
    });

    const populated = await Notification.findById(notification._id)
      .populate('sender', 'name avatar');

    // Emit Real-time Event via Socket.io
    io.to(recipientId.toString()).emit('new_notification', populated);

    return populated;
  } catch (error) {
    console.error("Notification Error:", error);
  }
};

/**
 * Check if user wants email notifications for a specific type
 */
const shouldSendEmail = async (userId, notificationType) => {
  try {
    const user = await User.findById(userId).select('notificationPreferences email');
    if (!user || !user.email) return { send: false, user: null };

    const prefs = user.notificationPreferences || {};

    const prefMap = {
      'task_assigned': prefs.emailAssignments !== false,
      'new_comment': prefs.emailComments !== false,
      'due_date': prefs.emailDueDates !== false,
      'status_change': prefs.emailStatusChanges === true, // Default off
      'mention': prefs.emailMentions !== false
    };

    return {
      send: prefMap[notificationType] ?? true,
      user
    };
  } catch (error) {
    console.error("Error checking email preferences:", error);
    return { send: false, user: null };
  }
};

/**
 * Queue an email for sending with retry logic
 */
const queueEmail = (emailData) => {
  emailQueue.push({ ...emailData, retries: 0, maxRetries: 3 });
  processQueue();
};

/**
 * Process email queue
 */
const processQueue = async () => {
  if (isProcessing || emailQueue.length === 0) return;

  isProcessing = true;

  while (emailQueue.length > 0) {
    const emailJob = emailQueue.shift();

    try {
      await sendEmail(emailJob);
      console.log(`✅ Email sent to ${emailJob.email}`);
    } catch (error) {
      console.error(`❌ Email failed to ${emailJob.email}:`, error.message);

      if (emailJob.retries < emailJob.maxRetries) {
        emailJob.retries++;
        // Exponential backoff: 1s, 2s, 4s
        setTimeout(() => {
          emailQueue.push(emailJob);
          processQueue();
        }, Math.pow(2, emailJob.retries) * 1000);
      }
    }
  }

  isProcessing = false;
};

/**
 * Send email notification for task assignment
 */
const sendTaskAssignmentEmail = async (assigneeId, { assignerName, task, projectName, projectId }) => {
  const { send, user } = await shouldSendEmail(assigneeId, 'task_assigned');
  if (!send) return;

  queueEmail({
    email: user.email,
    subject: `New Task Assigned: ${task.title}`,
    message: taskAssignmentTemplate({ assignerName, task, projectName, projectId })
  });
};

/**
 * Send email notification for new comment
 */
const sendCommentEmail = async (recipientId, { commenterName, task, projectId, comment }) => {
  const { send, user } = await shouldSendEmail(recipientId, 'new_comment');
  if (!send) return;

  queueEmail({
    email: user.email,
    subject: `New Comment on: ${task.title}`,
    message: newCommentTemplate({ commenterName, task, projectId, comment })
  });
};

/**
 * Send email notification for due date reminder
 */
const sendDueDateReminderEmail = async (assigneeId, { task, projectName, projectId, daysUntilDue }) => {
  const { send, user } = await shouldSendEmail(assigneeId, 'due_date');
  if (!send) return;

  queueEmail({
    email: user.email,
    subject: `⏰ Reminder: "${task.title}" is due ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}`,
    message: dueDateReminderTemplate({ task, projectName, projectId, daysUntilDue })
  });
};

/**
 * Send email notification for task status change
 */
const sendStatusChangeEmail = async (assigneeId, { changerName, task, projectId, oldStatus, newStatus }) => {
  const { send, user } = await shouldSendEmail(assigneeId, 'status_change');
  if (!send) return;

  queueEmail({
    email: user.email,
    subject: `Task Updated: ${task.title}`,
    message: taskStatusChangeTemplate({ changerName, task, projectId, oldStatus, newStatus })
  });
};

/**
 * Send email notification for mention
 */
const sendMentionEmail = async (mentionedUserId, { mentionerName, task, projectId, comment }) => {
  const { send, user } = await shouldSendEmail(mentionedUserId, 'mention');
  if (!send) return;

  queueEmail({
    email: user.email,
    subject: `${mentionerName} mentioned you`,
    message: mentionTemplate({ mentionerName, task, projectId, comment })
  });
};

module.exports = {
  sendNotification,
  sendTaskAssignmentEmail,
  sendCommentEmail,
  sendDueDateReminderEmail,
  sendStatusChangeEmail,
  sendMentionEmail
};