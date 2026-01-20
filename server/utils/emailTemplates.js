/**
 * Email Templates for TaskKollecta
 * Professional HTML email templates for notifications
 */

const APP_NAME = 'TaskKollecta';
const PRIMARY_COLOR = '#6366f1';
const DARK_COLOR = '#1e1b4b';

// Base wrapper for all emails
const baseTemplate = (content, preheader = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 700; color: ${PRIMARY_COLOR}; text-decoration: none; }
    .title { font-size: 20px; font-weight: 600; color: ${DARK_COLOR}; margin: 0 0 8px 0; }
    .subtitle { color: #71717a; font-size: 14px; margin: 0; }
    .content { color: #3f3f46; font-size: 15px; line-height: 1.6; }
    .task-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .task-title { font-weight: 600; color: ${DARK_COLOR}; margin: 0 0 8px 0; font-size: 16px; }
    .task-meta { display: flex; gap: 16px; font-size: 13px; color: #6b7280; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .badge-priority-urgent { background: #fef2f2; color: #dc2626; }
    .badge-priority-high { background: #fff7ed; color: #ea580c; }
    .badge-priority-medium { background: #fefce8; color: #ca8a04; }
    .badge-priority-low { background: #f0fdf4; color: #16a34a; }
    .btn { display: inline-block; background: ${PRIMARY_COLOR}; color: #fff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; margin-top: 20px; }
    .btn:hover { background: ${DARK_COLOR}; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #a1a1aa; }
    .footer a { color: #71717a; }
    .comment-box { background: #f3f4f6; border-left: 3px solid ${PRIMARY_COLOR}; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; font-style: italic; }
    .due-alert { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; margin: 16px 0; }
    .preheader { display: none; max-width: 0; max-height: 0; overflow: hidden; }
  </style>
</head>
<body>
  <span class="preheader">${preheader}</span>
  <div class="container">
    <div class="card">
      <div class="header">
        <a href="${process.env.CLIENT_URL}" class="logo">${APP_NAME}</a>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>You're receiving this because you're a member of ${APP_NAME}.</p>
      <p><a href="${process.env.CLIENT_URL}/settings">Manage notification settings</a></p>
    </div>
  </div>
</body>
</html>
`;

// Priority badge helper
const getPriorityBadge = (priority) => {
    const badges = {
        urgent: '<span class="badge badge-priority-urgent">Urgent</span>',
        high: '<span class="badge badge-priority-high">High</span>',
        medium: '<span class="badge badge-priority-medium">Medium</span>',
        low: '<span class="badge badge-priority-low">Low</span>'
    };
    return badges[priority] || badges.medium;
};

// Format date helper
const formatDate = (date) => {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

/**
 * Task Assignment Email
 */
const taskAssignmentTemplate = ({ assignerName, task, projectName, projectId }) => {
    const content = `
    <h1 class="title">New Task Assigned to You</h1>
    <p class="subtitle">${assignerName} assigned you a task</p>
    
    <div class="content">
      <div class="task-card">
        <h3 class="task-title">${task.title}</h3>
        <div class="task-meta">
          <span>📁 ${projectName || 'General'}</span>
          <span>📅 ${formatDate(task.dueDate)}</span>
          ${getPriorityBadge(task.priority)}
        </div>
        ${task.description ? `<p style="margin-top: 12px; color: #6b7280; font-size: 14px;">${task.description.substring(0, 200)}${task.description.length > 200 ? '...' : ''}</p>` : ''}
      </div>
      
      <a href="${process.env.CLIENT_URL}/project/${projectId}" class="btn">View Task</a>
    </div>
  `;
    return baseTemplate(content, `${assignerName} assigned you: ${task.title}`);
};

/**
 * New Comment Email
 */
const newCommentTemplate = ({ commenterName, task, projectId, comment }) => {
    const content = `
    <h1 class="title">New Comment on Your Task</h1>
    <p class="subtitle">${commenterName} commented on "${task.title}"</p>
    
    <div class="content">
      <div class="comment-box">
        "${comment.length > 300 ? comment.substring(0, 300) + '...' : comment}"
      </div>
      
      <a href="${process.env.CLIENT_URL}/project/${projectId}" class="btn">Reply</a>
    </div>
  `;
    return baseTemplate(content, `${commenterName} commented: "${comment.substring(0, 50)}..."`);
};

/**
 * Due Date Reminder Email
 */
const dueDateReminderTemplate = ({ task, projectName, projectId, daysUntilDue }) => {
    const urgencyText = daysUntilDue === 0
        ? 'is due today!'
        : daysUntilDue === 1
            ? 'is due tomorrow!'
            : `is due in ${daysUntilDue} days`;

    const content = `
    <h1 class="title">⏰ Task Due Soon</h1>
    <p class="subtitle">Your task ${urgencyText}</p>
    
    <div class="content">
      <div class="due-alert">
        <strong>📅 Due: ${formatDate(task.dueDate)}</strong>
      </div>
      
      <div class="task-card">
        <h3 class="task-title">${task.title}</h3>
        <div class="task-meta">
          <span>📁 ${projectName || 'General'}</span>
          ${getPriorityBadge(task.priority)}
        </div>
      </div>
      
      <a href="${process.env.CLIENT_URL}/project/${projectId}" class="btn">View Task</a>
    </div>
  `;
    return baseTemplate(content, `Reminder: "${task.title}" ${urgencyText}`);
};

/**
 * Task Status Change Email
 */
const taskStatusChangeTemplate = ({ changerName, task, projectId, oldStatus, newStatus }) => {
    const statusLabels = {
        'todo': 'To Do',
        'in-progress': 'In Progress',
        'review': 'Review',
        'done': 'Done'
    };

    const content = `
    <h1 class="title">Task Status Updated</h1>
    <p class="subtitle">${changerName} moved your task</p>
    
    <div class="content">
      <div class="task-card">
        <h3 class="task-title">${task.title}</h3>
        <p style="margin: 12px 0; font-size: 14px;">
          <span style="color: #9ca3af; text-decoration: line-through;">${statusLabels[oldStatus] || oldStatus}</span>
          <span style="margin: 0 8px;">→</span>
          <strong style="color: ${PRIMARY_COLOR};">${statusLabels[newStatus] || newStatus}</strong>
        </p>
      </div>
      
      <a href="${process.env.CLIENT_URL}/project/${projectId}" class="btn">View Task</a>
    </div>
  `;
    return baseTemplate(content, `Task "${task.title}" moved to ${statusLabels[newStatus] || newStatus}`);
};

/**
 * Mention Email
 */
const mentionTemplate = ({ mentionerName, task, projectId, comment }) => {
    const content = `
    <h1 class="title">You Were Mentioned</h1>
    <p class="subtitle">${mentionerName} mentioned you in a comment</p>
    
    <div class="content">
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">On task: <strong>${task.title}</strong></p>
      
      <div class="comment-box">
        "${comment.length > 300 ? comment.substring(0, 300) + '...' : comment}"
      </div>
      
      <a href="${process.env.CLIENT_URL}/project/${projectId}" class="btn">View Conversation</a>
    </div>
  `;
    return baseTemplate(content, `${mentionerName} mentioned you: "${comment.substring(0, 50)}..."`);
};

module.exports = {
    taskAssignmentTemplate,
    newCommentTemplate,
    dueDateReminderTemplate,
    taskStatusChangeTemplate,
    mentionTemplate
};
