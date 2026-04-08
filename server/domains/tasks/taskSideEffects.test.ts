import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../tests/setup';
import User from '../../models/User';
import Organization from '../../models/Organization';
import Membership from '../../models/Membership';
import Project from '../../models/Project';
import Task from '../../models/Task';
import Activity from '../../models/Activity';
import Notification from '../../models/Notification';
import Automation from '../../models/Automation';

const taskSideEffects = require('./taskSideEffects');

describe('taskSideEffects', () => {
  let reporter: any;
  let assignee: any;
  let replacementAssignee: any;
  let org: any;
  let project: any;
  let task: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    reporter = await User.create({
      name: 'Reporter',
      email: 'task-sideeffects-reporter@test.com',
      password: 'password123',
    });

    assignee = await User.create({
      name: 'Assignee',
      email: 'task-sideeffects-assignee@test.com',
      password: 'password123',
      notificationPreferences: {
        emailAssignments: false,
        emailStatusChanges: false,
      },
    });

    replacementAssignee = await User.create({
      name: 'Replacement',
      email: 'task-sideeffects-replacement@test.com',
      password: 'password123',
      notificationPreferences: {
        emailAssignments: false,
        emailStatusChanges: false,
      },
    });

    org = await Organization.create({
      name: 'Task Side Effects Org',
      createdBy: reporter._id,
    });

    await Membership.create([
      { user: reporter._id, organization: org._id, role: 'owner' },
      { user: assignee._id, organization: org._id, role: 'member' },
      { user: replacementAssignee._id, organization: org._id, role: 'member' },
    ]);

    project = await Project.create({
      name: 'Task Side Effects Project',
      organization: org._id,
      createdBy: reporter._id,
      lead: assignee._id,
    });

    task = await Task.create({
      title: 'Automate side effects',
      project: project._id,
      organization: org._id,
      reporter: reporter._id,
      assignee: assignee._id,
      status: 'todo',
    });
  });

  it('creates a task assignment notification for internal assignees', async () => {
    await taskSideEffects.notifyTaskCreationAssignment({
      io: { to: vi.fn(() => ({ emit: vi.fn() })) },
      user: reporter,
      task: {
        _id: task._id,
        title: task.title,
        project: { name: project.name },
      },
      projectId: project._id,
      resolvedAssignee: assignee._id,
      storedAssigneeEmail: null,
      externalInviteUrl: null,
    });

    const notifications = await Notification.find({ recipient: assignee._id });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('task_assigned');
    expect(notifications[0].relatedId.toString()).toBe(task._id.toString());
  });

  it('records task activities and invalidates project caches without failing the flow', async () => {
    const io = { to: vi.fn(() => ({ emit: vi.fn() })) };

    await taskSideEffects.recordTaskCreated({ io, user: reporter, task });
    await taskSideEffects.recordTaskDeleted({ io, user: reporter, task });
    await taskSideEffects.recordTaskMoved({ io, user: reporter, task, status: 'done' });
    await taskSideEffects.invalidateProjectTasks(project._id);

    const activities = await Activity.find({ task: task._id }).sort({ createdAt: 1 });
    expect(activities).toHaveLength(3);
    expect(activities.map((activity) => activity.action)).toEqual(['created', 'deleted', 'moved']);
    expect(activities[2].details).toContain('done');
  });

  it('runs automation rules and emits assignment notifications on update', async () => {
    await Automation.create({
      project: project._id,
      triggerType: 'status_change',
      triggerValue: 'done',
      actionType: 'send_notification',
      actionValue: 'assignee',
      isActive: true,
    });

    await taskSideEffects.runTaskUpdateAutomations({
      task,
      body: { status: 'done' },
    });

    const automationNotifications = await Notification.find({
      recipient: assignee._id,
      type: 'automation',
      relatedId: task._id,
    });
    expect(automationNotifications).toHaveLength(1);

    await taskSideEffects.notifyTaskUpdate({
      io: { to: vi.fn(() => ({ emit: vi.fn() })) },
      user: reporter,
      oldTask: { assignee: { toString: () => assignee._id.toString() }, status: 'todo' },
      updatedTask: {
        _id: task._id,
        title: task.title,
        project: { _id: project._id, name: project.name, toString: () => project._id.toString() },
        assignee: { _id: replacementAssignee._id },
      },
      body: {
        assignee: replacementAssignee._id.toString(),
        status: 'done',
      },
    });

    const assignmentNotifications = await Notification.find({
      recipient: replacementAssignee._id,
      type: 'task_assigned',
      relatedId: task._id,
    });
    expect(assignmentNotifications).toHaveLength(1);
  });
});
