import { it, expect, describe, beforeEach } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from '../../tests/setup';
import User from '../../models/User';
import Organization from '../../models/Organization';
import Membership from '../../models/Membership';
import Project from '../../models/Project';

describe('Projects API — CRUD and management', () => {
  let userToken: string;
  let userId: string;
  let orgId: string;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Project User',
      email: 'project@test.com',
      password: 'password123',
    });
    userId = user._id.toString();
    userToken = getTestToken(userId);

    const org = await Organization.create({
      name: 'Project Org',
      createdBy: userId,
    });
    orgId = org._id.toString();

    await Membership.create({
      user: userId,
      organization: orgId,
      role: 'owner',
    });
  });

  it('should create a new project successfully', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'New Project',
        description: 'Test project description',
        orgId,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Project');
    expect(res.body.workflowStatuses.map((status: any) => status.id)).toEqual(['todo', 'in-progress', 'review', 'done']);
  });

  it('should get projects by organization', async () => {
    await Project.create({
      name: 'Existing Project',
      organization: orgId,
      createdBy: userId,
    });

    const res = await request(app)
      .get(`/api/projects/${orgId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should get all projects for the active workspace', async () => {
    await Project.create([
      {
        name: 'Workspace Project A',
        organization: orgId,
        createdBy: userId,
      },
      {
        name: 'Workspace Project B',
        organization: orgId,
        createdBy: userId,
      },
    ]);

    const res = await request(app)
      .get('/api/projects')
      .set('Cookie', [`jwt=${userToken}`])
      .set('x-active-org', orgId);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('should get project details', async () => {
    const project = await Project.create({
      name: 'Details Project',
      organization: orgId,
      createdBy: userId,
    });

    const res = await request(app)
      .get(`/api/projects/single/${project._id}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Details Project');
  });

  it('should update project details', async () => {
    const project = await Project.create({
      name: 'Update Me',
      organization: orgId,
      createdBy: userId,
    });

    const res = await request(app)
      .put(`/api/projects/${project._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Updated Project Name',
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Project Name');
  });

  it('should save configurable workflow statuses and custom fields', async () => {
    const project = await Project.create({
      name: 'Workflow Project',
      organization: orgId,
      createdBy: userId,
    });

    const res = await request(app)
      .put(`/api/projects/${project._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        workflowStatuses: [
          { id: 'queued', label: 'Queued', color: '#64748b', order: 0 },
          { id: 'approved', label: 'Approved', color: '#22c55e', order: 1, isDone: true, wipLimit: 3 },
        ],
        customFields: [
          { key: 'client_name', name: 'Client Name', type: 'text', order: 0 },
          { key: 'approval_state', name: 'Approval State', type: 'select', options: ['Draft', 'Approved'], order: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.workflowStatuses.map((status: any) => status.id)).toEqual(['queued', 'approved']);
    expect(res.body.workflowStatuses[1].isDone).toBe(true);
    expect(res.body.workflowStatuses[1].wipLimit).toBe(3);
    expect(res.body.customFields.map((field: any) => field.key)).toEqual(['client_name', 'approval_state']);
    expect(res.body.customFields[1].options).toEqual(['Draft', 'Approved']);
  });

  it('should fail creation without required fields', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        description: 'No Name',
        orgId,
      });

    expect(res.status).toBe(400);
  });

  it('should delete a project', async () => {
    const project = await Project.create({
      name: 'Delete Me',
      organization: orgId,
      createdBy: userId,
    });

    const res = await request(app)
      .delete(`/api/projects/${project._id}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(res.status).toBe(200);
    const deletedProject = await Project.findById(project._id);
    expect(deletedProject).toBeNull();
  });
});
