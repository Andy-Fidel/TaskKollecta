import { it, expect, describe, beforeEach } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Project from '../models/Project';
import Task from '../models/Task';

describe('Tasks API — CRUD, subtasks, and board management', () => {
  let userToken: string;
  let userId: string;
  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    // Setup initial data for all task tests
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
        status: 'in-progress',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in-progress');
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
      subtasks: [{ title: 'Finish me' }]
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
