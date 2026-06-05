import { beforeEach, describe, expect, it, vi } from 'vitest';
import './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import Project from '../models/Project';
import Task from '../models/Task';
import Automation from '../models/Automation';
import Notification from '../models/Notification';
import Comment from '../models/Comment';

const runAutomations = require('../utils/automationEngine');

describe('automationEngine', () => {
  let owner: any;
  let assignee: any;
  let org: any;
  let project: any;
  let task: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    owner = await User.create({
      name: 'Engine Owner',
      email: 'engine-owner@test.com',
      password: 'password123',
      notificationPreferences: {
        emailAssignments: false,
        emailComments: false,
        emailDueDates: false,
        emailStatusChanges: false,
        emailMentions: false,
      },
    });

    assignee = await User.create({
      name: 'Engine Assignee',
      email: 'engine-assignee@test.com',
      password: 'password123',
      notificationPreferences: {
        emailAssignments: false,
        emailComments: false,
        emailDueDates: false,
        emailStatusChanges: false,
        emailMentions: false,
      },
    });

    org = await Organization.create({
      name: 'Engine Org',
      createdBy: owner._id,
    });

    await Membership.create([
      { user: owner._id, organization: org._id, role: 'owner' },
      { user: assignee._id, organization: org._id, role: 'member' },
    ]);

    project = await Project.create({
      name: 'Engine Project',
      organization: org._id,
      lead: owner._id,
      members: [{ user: owner._id, role: 'owner' }, { user: assignee._id, role: 'editor' }],
      customFields: [{ key: 'impact', name: 'Impact', type: 'select', options: ['Low', 'High'] }],
      createdBy: owner._id,
    });

    task = await Task.create({
      title: 'Automated task',
      project: project._id,
      organization: org._id,
      reporter: owner._id,
      assignee: assignee._id,
      status: 'todo',
      priority: 'urgent',
    });
  });

  it('runs conditions and multiple actions, then records execution history', async () => {
    const automation = await Automation.create({
      project: project._id,
      name: 'Urgent done workflow',
      triggers: [{ type: 'status_change', value: 'done' }],
      conditions: [{ field: 'priority', operator: 'equals', value: 'urgent' }],
      actions: [
        { type: 'change_status', value: 'review' },
        { type: 'create_subtask', value: { title: 'Review {{task_name}}' } },
        { type: 'add_comment', value: { message: 'Automation touched {{task_name}}.' } },
        { type: 'set_custom_field', fieldKey: 'impact', value: 'High' },
        { type: 'send_notification', value: 'project_lead' },
      ],
      createdBy: owner._id,
      updatedBy: owner._id,
    });

    await runAutomations(project._id, 'status_change', 'done', task, { actorId: owner._id });

    const updatedTask = await Task.findById(task._id);
    const comments = await Comment.find({ task: task._id });
    const notifications = await Notification.find({ recipient: owner._id, type: 'automation', relatedId: task._id });
    const updatedAutomation = await Automation.findById(automation._id);

    expect(updatedTask?.status).toBe('review');
    expect(updatedTask?.subtasks.map((subtask: any) => subtask.title)).toContain('Review Automated task');
    expect(updatedTask?.customFieldValues.find((field: any) => field.key === 'impact')?.value).toBe('High');
    expect(comments[0].content).toBe('Automation touched Automated task.');
    expect(notifications).toHaveLength(1);
    expect(updatedAutomation?.lastRunStatus).toBe('success');
    expect(updatedAutomation?.executionLog[0].message).toMatch(/5 actions processed/i);
  });

  it('skips actions when conditions do not match', async () => {
    const automation = await Automation.create({
      project: project._id,
      name: 'Only low priority',
      triggers: [{ type: 'status_change', value: 'done' }],
      conditions: [{ field: 'priority', operator: 'equals', value: 'low' }],
      actions: [{ type: 'change_status', value: 'review' }],
    });

    await runAutomations(project._id, 'status_change', 'done', task, { actorId: owner._id });

    const updatedTask = await Task.findById(task._id);
    const updatedAutomation = await Automation.findById(automation._id);

    expect(updatedTask?.status).toBe('todo');
    expect(updatedAutomation?.lastRunStatus).toBe('skipped');
    expect(updatedAutomation?.executionLog[0].message).toMatch(/conditions/i);
  });
});
