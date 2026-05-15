import { describe, expect, it } from 'vitest';
import './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Project from '../models/Project';
import Task from '../models/Task';
import Notification from '../models/Notification';

const { sendDueDateReminders } = require('../utils/dueDateReminder');

describe('dueDateReminder', () => {
  it('creates deduplicated in-app notifications for due task reminders', async () => {
    const reporter = await User.create({
      name: 'Reminder Reporter',
      email: 'reminder-reporter@test.com',
      password: 'password123',
    });

    const assignee = await User.create({
      name: 'Reminder Assignee',
      email: 'reminder-assignee@test.com',
      password: 'password123',
      notificationPreferences: {
        emailDueDates: false,
      },
    });

    const org = await Organization.create({
      name: 'Reminder Org',
      createdBy: reporter._id,
    });

    const project = await Project.create({
      name: 'Reminder Project',
      organization: org._id,
      createdBy: reporter._id,
      lead: reporter._id,
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    dueDate.setHours(12, 0, 0, 0);

    const task = await Task.create({
      title: 'Submit client plan',
      project: project._id,
      organization: org._id,
      reporter: reporter._id,
      assignee: assignee._id,
      status: 'todo',
      dueDate,
    });

    await sendDueDateReminders(1);
    await sendDueDateReminders(1);

    const notifications = await Notification.find({
      recipient: assignee._id,
      type: 'due_date',
      relatedId: task._id,
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].relatedProject?.toString()).toBe(project._id.toString());
    expect(notifications[0].actionUrl).toBe(`/project/${project._id}`);
    expect(notifications[0].metadata.daysAhead).toBe(1);
  });
});
