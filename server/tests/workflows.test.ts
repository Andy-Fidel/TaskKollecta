import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../utils/sendEmail', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

import { app, getTestToken } from './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import Project from '../models/Project';
import Task from '../models/Task';
import Notification from '../models/Notification';
import Activity from '../models/Activity';
import Automation from '../models/Automation';
import Invite from '../models/Invite';

describe('Workflow API — cross-feature flows', () => {
  let owner: any;
  let assignee: any;
  let ownerToken: string;
  let assigneeToken: string;
  let org: any;
  let project: any;

  beforeEach(async () => {
    owner = await User.create({
      name: 'Workflow Owner',
      email: 'workflow-owner@test.com',
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
      name: 'Workflow Assignee',
      email: 'workflow-assignee@test.com',
      password: 'password123',
      notificationPreferences: {
        emailAssignments: false,
        emailComments: false,
        emailDueDates: false,
        emailStatusChanges: false,
        emailMentions: false,
      },
    });

    ownerToken = getTestToken(owner._id.toString());
    assigneeToken = getTestToken(assignee._id.toString());

    org = await Organization.create({
      name: 'Workflow Org',
      createdBy: owner._id,
    });

    await Membership.create([
      { user: owner._id, organization: org._id, role: 'owner' },
      { user: assignee._id, organization: org._id, role: 'member' },
    ]);

    project = await Project.create({
      name: 'Workflow Project',
      organization: org._id,
      lead: owner._id,
      createdBy: owner._id,
    });
  });

  it('creates an assigned task and records notification/activity side effects', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Cookie', [`jwt=${ownerToken}`])
      .send({
        title: 'Prepare workflow launch',
        description: 'Create the initial launch plan',
        projectId: project._id.toString(),
        orgId: org._id.toString(),
        assignee: assignee._id.toString(),
        priority: 'high',
      });

    expect(response.status).toBe(201);

    const createdTaskId = response.body._id;
    const notifications = await Notification.find({ recipient: assignee._id, relatedId: createdTaskId });
    const activities = await Activity.find({ task: createdTaskId });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('task_assigned');
    expect(activities).toHaveLength(1);
    expect(activities[0].action).toBe('created');
  });

  it('blocks completion when unfinished dependencies exist', async () => {
    const blocker = await Task.create({
      title: 'Blocker task',
      project: project._id,
      organization: org._id,
      reporter: owner._id,
      assignee: owner._id,
      status: 'todo',
    });

    const blockedTask = await Task.create({
      title: 'Blocked task',
      project: project._id,
      organization: org._id,
      reporter: owner._id,
      assignee: assignee._id,
      status: 'in-progress',
      dependencies: [blocker._id],
    });

    const response = await request(app)
      .put(`/api/tasks/${blockedTask._id}`)
      .set('Cookie', [`jwt=${assigneeToken}`])
      .send({ status: 'done' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/waiting on/i);

    const persisted = await Task.findById(blockedTask._id);
    expect(persisted?.status).toBe('in-progress');
  });

  it('triggers automation notifications when a task status changes', async () => {
    await Automation.create({
      project: project._id,
      triggerType: 'status_change',
      triggerValue: 'done',
      actionType: 'send_notification',
      actionValue: 'assignee',
      isActive: true,
    });

    const task = await Task.create({
      title: 'Automated follow-up',
      project: project._id,
      organization: org._id,
      reporter: owner._id,
      assignee: assignee._id,
      status: 'todo',
    });

    const response = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set('Cookie', [`jwt=${ownerToken}`])
      .send({ status: 'done' });

    expect(response.status).toBe(200);

    const automationNotification = await Notification.findOne({
      recipient: assignee._id,
      type: 'automation',
      relatedId: task._id,
    });
    const movedActivity = await Activity.findOne({
      task: task._id,
      action: 'moved',
    });

    expect(automationNotification).toBeTruthy();
    expect(automationNotification?.message).toMatch(/status changed to done/i);
    expect(movedActivity).toBeTruthy();
  });

  it('accepts an invite token during signup and grants workspace membership', async () => {
    const inviteResponse = await request(app)
      .post('/api/invites')
      .set('Cookie', [`jwt=${ownerToken}`])
      .send({
        email: 'new-member@test.com',
        organizationId: org._id.toString(),
        role: 'member',
      });

    expect(inviteResponse.status).toBe(201);

    const invite = await Invite.findOne({ email: 'new-member@test.com', organization: org._id });
    expect(invite).toBeTruthy();

    const signupResponse = await request(app)
      .post('/api/users')
      .send({
        name: 'New Member',
        email: 'new-member@test.com',
        password: 'password123',
        inviteToken: invite?.token,
      });

    expect(signupResponse.status).toBe(201);
    expect(signupResponse.body.isInvitee).toBe(true);
    expect(signupResponse.body.onboardingCompleted).toBe(false);

    const createdUser = await User.findOne({ email: 'new-member@test.com' });
    const membership = await Membership.findOne({
      user: createdUser?._id,
      organization: org._id,
    });
    const refreshedInvite = await Invite.findById(invite?._id);

    expect(membership).toBeTruthy();
    expect(membership?.role).toBe('member');
    expect(refreshedInvite?.status).toBe('accepted');
  });
});
