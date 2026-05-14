import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import Project from '../models/Project';
import Form from '../models/Form';
import Task from '../models/Task';

describe('Forms API', () => {
  let userToken: string;
  let userId: string;
  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Form User',
      email: 'form@test.com',
      password: 'password123',
    });
    userId = user._id.toString();
    userToken = getTestToken(userId);

    const org = await Organization.create({
      name: 'Form Org',
      createdBy: userId,
    });
    orgId = org._id.toString();

    await Membership.create({
      user: userId,
      organization: orgId,
      role: 'owner',
    });

    const project = await Project.create({
      name: 'Form Project',
      organization: orgId,
      createdBy: userId,
      workflowStatuses: [
        { id: 'intake', label: 'Intake', order: 0 },
        { id: 'done', label: 'Done', order: 1, isDone: true },
      ],
      customFields: [
        { key: 'client', name: 'Client', type: 'text' },
        { key: 'budget', name: 'Budget', type: 'number' },
        { key: 'approved', name: 'Approved', type: 'checkbox' },
      ],
    });
    projectId = project._id.toString();
  });

  it('should create tasks from submissions and map answers to custom fields', async () => {
    const form = await Form.create({
      title: 'Request Intake',
      project: projectId,
      createdBy: userId,
      fields: [
        { id: 'title', type: 'text', label: 'Request Title', required: true },
        { id: 'client', type: 'text', label: 'Client', customFieldKey: 'client' },
        { id: 'budget', type: 'text', label: 'Budget', customFieldKey: 'budget' },
        { id: 'approved', type: 'checkbox', label: 'Approved', options: ['Yes'], customFieldKey: 'approved' },
      ],
    });

    const res = await request(app)
      .post(`/api/forms/${form._id}/submit`)
      .send({
        title: 'Launch request',
        client: 'Acme',
        budget: '5000',
        approved: ['Yes'],
      });

    expect(res.status).toBe(201);
    const task = await Task.findById(res.body.taskId);
    expect(task?.title).toBe('Launch request');
    expect(task?.status).toBe('intake');
    expect(task?.projectMemberships[0].project.toString()).toBe(projectId);
    expect(task?.customFieldValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'client', value: 'Acme' }),
        expect.objectContaining({ key: 'budget', value: 5000 }),
        expect.objectContaining({ key: 'approved', value: true }),
      ]),
    );
  });

  it('should save form field custom field mappings', async () => {
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        title: 'Mapped Form',
        projectId,
        fields: [
          { id: 'client', type: 'text', label: 'Client', customFieldKey: 'client' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.fields[0].customFieldKey).toBe('client');
  });
});
