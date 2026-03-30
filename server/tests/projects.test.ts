import { it, expect, describe, beforeEach } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Project from '../models/Project';

describe('Projects API — CRUD and management', () => {
  let userToken: string;
  let userId: string;
  let orgId: string;

  beforeEach(async () => {
    // Setup initial user and organization
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
