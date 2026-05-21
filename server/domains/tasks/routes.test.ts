import { it, expect, describe, beforeEach } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from '../../tests/setup';
import User from '../../models/User';
import Organization from '../../models/Organization';
import Membership from '../../models/Membership';
import Project from '../../models/Project';
import Task from '../../models/Task';

describe('Tasks API — CRUD, subtasks, and board management', () => {
  let userToken: string;
  let userId: string;
  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Task User',
      email: 'task@test.com',
      password: 'password123',
    });
    userId = user._id.toString();
    userToken = getTestToken(userId);

    const org = await Organization.create({
      name: 'Test Org',
      createdBy: userId,
    });
    orgId = org._id.toString();

    await Membership.create({
      user: userId,
      organization: orgId,
      role: 'owner',
    });

    const project = await Project.create({
      name: 'Test Project',
      organization: orgId,
      createdBy: userId,
    });
    projectId = project._id.toString();
  });

  it('should create a new task successfully', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        title: 'Learn Vitest',
        description: 'Set up automated tests',
        projectId,
        orgId,
        priority: 'high',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Learn Vitest');
    expect(res.body.projectMemberships[0].project._id).toBe(projectId);
  });

  it('should create a task with embedded checklist subtasks', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        title: 'Plan launch',
        projectId,
        orgId,
        subtasks: [
          { title: 'Draft announcement' },
          { title: 'Review timeline' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.subtasks).toHaveLength(2);
    expect(res.body.subtasks.map((subtask: any) => subtask.title)).toEqual([
      'Draft announcement',
      'Review timeline',
    ]);
    expect(res.body.subtasks.every((subtask: any) => subtask.isCompleted === false)).toBe(true);
  });

  it('should create a task with dependencies', async () => {
    const dependency = await Task.create({
      title: 'Finish setup',
      project: projectId,
      organization: orgId,
      reporter: userId,
      createdBy: userId,
    });

    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        title: 'Launch campaign',
        projectId,
        orgId,
        dependencies: [dependency._id.toString()],
      });

    expect(res.status).toBe(201);
    expect(res.body.dependencies).toHaveLength(1);
    expect(res.body.dependencies[0]._id).toBe(dependency._id.toString());
    expect(res.body.dependencies[0].title).toBe('Finish setup');
  });

  it('should fail task creation without required fields', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        description: 'Missing title',
      });

    expect(res.status).toBe(400);
  });

  it('should get project tasks', async () => {
    await Task.create({
      title: 'Existing Task',
      project: projectId,
      organization: orgId,
      reporter: userId,
      createdBy: userId,
    });

    const res = await request(app)
      .get(`/api/tasks/project/${projectId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should enforce guest access settings and read-only task permissions', async () => {
    const guest = await User.create({
      name: 'Task Guest',
      email: 'task-guest@test.com',
      password: 'password123',
    });
    const guestToken = getTestToken(guest._id.toString());

    await Membership.create({
      user: guest._id,
      organization: orgId,
      role: 'guest',
    });

    const task = await Task.create({
      title: 'Guest readable task',
      project: projectId,
      organization: orgId,
      reporter: userId,
      createdBy: userId,
    });

    const blockedRead = await request(app)
      .get(`/api/tasks/project/${projectId}`)
      .set('Cookie', [`jwt=${guestToken}`]);
    expect(blockedRead.status).toBe(404);

    await Organization.findByIdAndUpdate(orgId, {
      defaultProjectSettings: {
        allowGuestAccess: true,
        requireApprovalToJoin: true,
      },
    });

    const allowedRead = await request(app)
      .get(`/api/tasks/project/${projectId}`)
      .set('Cookie', [`jwt=${guestToken}`]);
    expect(allowedRead.status).toBe(200);
    expect(allowedRead.body.map((item: any) => item._id)).toContain(task._id.toString());

    const createRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', [`jwt=${guestToken}`])
      .send({ title: 'Guest task', projectId, orgId });
    expect(createRes.status).toBe(403);

    const updateRes = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set('Cookie', [`jwt=${guestToken}`])
      .send({ title: 'Guest edit' });
    expect(updateRes.status).toBe(403);

    const subtaskRes = await request(app)
      .post(`/api/tasks/${task._id}/subtasks`)
      .set('Cookie', [`jwt=${guestToken}`])
      .send({ title: 'Guest subtask' });
    expect(subtaskRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set('Cookie', [`jwt=${guestToken}`]);
    expect(deleteRes.status).toBe(403);
  });

  it('should update task status', async () => {
    const task = await Task.create({
      title: 'Update Me',
      project: projectId,
      organization: orgId,
      reporter: userId,
      createdBy: userId,
    });

    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        status: 'approved',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('should update and persist task board index', async () => {
    const task = await Task.create({
      title: 'Reorder Me',
      project: projectId,
      organization: orgId,
      reporter: userId,
      createdBy: userId,
      index: 1000,
    });

    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        status: 'review',
        index: 3000,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('review');
    expect(res.body.index).toBe(3000);

    const savedTask = await Task.findById(task._id);
    expect(savedTask?.index).toBe(3000);
  });

  it('should save custom field values on a task', async () => {
    const task = await Task.create({
      title: 'Custom Fields Task',
      project: projectId,
      organization: orgId,
      reporter: userId,
      createdBy: userId,
    });

    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        customFieldValues: [
          { key: 'client_name', value: 'Acme' },
          { key: 'budget', value: 5000 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.customFieldValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'client_name', value: 'Acme' }),
        expect.objectContaining({ key: 'budget', value: 5000 }),
      ]),
    );
  });

  it('should add an existing task to a secondary project and return it from both projects', async () => {
    const secondaryProject = await Project.create({
      name: 'Secondary Project',
      organization: orgId,
      createdBy: userId,
    });
    const task = await Task.create({
      title: 'Shared Task',
      project: projectId,
      projectMemberships: [{ project: projectId }],
      organization: orgId,
      reporter: userId,
      createdBy: userId,
    });

    const addRes = await request(app)
      .post(`/api/tasks/${task._id}/projects`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({ projectId: secondaryProject._id.toString() });

    expect(addRes.status).toBe(200);
    expect(addRes.body.projectMemberships.map((membership: any) => membership.project._id)).toEqual(
      expect.arrayContaining([projectId, secondaryProject._id.toString()]),
    );

    const secondaryTasks = await request(app)
      .get(`/api/tasks/project/${secondaryProject._id}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(secondaryTasks.status).toBe(200);
    expect(secondaryTasks.body.map((item: any) => item.title)).toContain('Shared Task');
  });

  it('should add a subtask successfully', async () => {
    const task = await Task.create({
      title: 'Task with Subtasks',
      project: projectId,
      organization: orgId,
      reporter: userId,
      createdBy: userId,
    });

    const res = await request(app)
      .post(`/api/tasks/${task._id}/subtasks`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        title: 'Subtask 1',
      });

    expect(res.status).toBe(200);
    expect(res.body.subtasks.length).toBe(1);
  });

  it('should toggle subtask completion', async () => {
    const task = await Task.create({
      title: 'Toggle Task',
      project: projectId,
      organization: orgId,
      reporter: userId,
      createdBy: userId,
      subtasks: [{ title: 'Finish me' }],
    });
    const subtaskId = task.subtasks[0]._id;

    const res = await request(app)
      .put(`/api/tasks/${task._id}/subtasks/${subtaskId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(res.status).toBe(200);
    const updatedSubtask = res.body.subtasks.find((s: any) => s._id === subtaskId.toString());
    expect(updatedSubtask.isCompleted).toBe(true);
  });

  it('should delete a task', async () => {
    const task = await Task.create({
      title: 'Delete Me',
      project: projectId,
      organization: orgId,
      reporter: userId,
      createdBy: userId,
    });

    const res = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(res.status).toBe(200);
    const deletedTask = await Task.findById(task._id);
    expect(deletedTask).toBeNull();
  });
});
