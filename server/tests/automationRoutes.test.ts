import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import Project from '../models/Project';
import Automation from '../models/Automation';

describe('Automation API', () => {
  let owner: any;
  let member: any;
  let ownerToken: string;
  let memberToken: string;
  let org: any;
  let project: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    owner = await User.create({
      name: 'Automation Owner',
      email: 'automation-owner@test.com',
      password: 'password123',
    });

    member = await User.create({
      name: 'Automation Member',
      email: 'automation-member@test.com',
      password: 'password123',
    });

    ownerToken = getTestToken(owner._id.toString());
    memberToken = getTestToken(member._id.toString());

    org = await Organization.create({
      name: 'Automation Org',
      createdBy: owner._id,
    });

    await Membership.create([
      { user: owner._id, organization: org._id, role: 'owner' },
      { user: member._id, organization: org._id, role: 'member' },
    ]);

    project = await Project.create({
      name: 'Automation Project',
      organization: org._id,
      lead: owner._id,
      members: [
        { user: owner._id, role: 'owner' },
        { user: member._id, role: 'editor' },
      ],
      customFields: [
        { key: 'impact', name: 'Impact', type: 'select', options: ['Low', 'High'] },
      ],
      createdBy: owner._id,
    });
  });

  it('creates, lists, updates, pauses, and deletes array-based rules', async () => {
    const createResponse = await request(app)
      .post('/api/automations')
      .set('Cookie', [`jwt=${ownerToken}`])
      .send({
        projectId: project._id.toString(),
        name: 'Escalate urgent work',
        description: 'Notify lead and add context when urgent work is done.',
        triggers: [{ type: 'status_change', value: 'done' }],
        conditions: [{ field: 'priority', operator: 'equals', value: 'urgent' }],
        actions: [
          { type: 'send_notification', value: 'project_lead' },
          { type: 'add_comment', value: { message: 'Automation reviewed {{task_name}}.' } },
          { type: 'set_custom_field', fieldKey: 'impact', value: 'High' },
        ],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.name).toBe('Escalate urgent work');
    expect(createResponse.body.triggers).toHaveLength(1);
    expect(createResponse.body.conditions).toHaveLength(1);
    expect(createResponse.body.actions).toHaveLength(3);
    expect(createResponse.body.triggerType).toBe('status_change');
    expect(createResponse.body.actionType).toBe('send_notification');

    const listResponse = await request(app)
      .get(`/api/automations/${project._id}`)
      .set('Cookie', [`jwt=${memberToken}`]);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);

    const updateResponse = await request(app)
      .patch(`/api/automations/${createResponse.body._id}`)
      .set('Cookie', [`jwt=${ownerToken}`])
      .send({
        name: 'Escalate completed urgent work',
        isActive: false,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe('Escalate completed urgent work');
    expect(updateResponse.body.isActive).toBe(false);

    const deleteResponse = await request(app)
      .delete(`/api/automations/${createResponse.body._id}`)
      .set('Cookie', [`jwt=${ownerToken}`]);

    expect(deleteResponse.status).toBe(200);
    expect(await Automation.countDocuments({ project: project._id })).toBe(0);
  });

  it('allows editors to view but not manage project automations', async () => {
    const automation = await Automation.create({
      project: project._id,
      name: 'Readonly rule',
      triggers: [{ type: 'task_overdue', value: 'any' }],
      actions: [{ type: 'send_notification', value: 'project_lead' }],
      createdBy: owner._id,
      updatedBy: owner._id,
    });

    const listResponse = await request(app)
      .get(`/api/automations/${project._id}`)
      .set('Cookie', [`jwt=${memberToken}`]);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body[0]._id).toBe(automation._id.toString());

    const patchResponse = await request(app)
      .patch(`/api/automations/${automation._id}`)
      .set('Cookie', [`jwt=${memberToken}`])
      .send({ isActive: false });

    expect(patchResponse.status).toBe(403);
  });

  it('normalizes legacy single trigger/action payloads', async () => {
    const response = await request(app)
      .post('/api/automations')
      .set('Cookie', [`jwt=${ownerToken}`])
      .send({
        projectId: project._id.toString(),
        triggerType: 'task_overdue',
        triggerValue: 'any',
        actionType: 'change_priority',
        actionValue: 'urgent',
      });

    expect(response.status).toBe(201);
    expect(response.body.triggers).toEqual([{ type: 'task_overdue', value: 'any' }]);
    expect(response.body.actions).toEqual([{ type: 'change_priority', value: 'urgent' }]);
    expect(response.body.name).toMatch(/task overdue/i);
  });
});
