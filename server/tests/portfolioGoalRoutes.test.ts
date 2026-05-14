import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import Project from '../models/Project';
import Task from '../models/Task';
import Portfolio from '../models/Portfolio';
import Goal from '../models/Goal';

describe('Portfolios and Goals API', () => {
  let userToken: string;
  let userId: string;
  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Strategy User',
      email: 'strategy@test.com',
      password: 'password123',
    });
    userId = user._id.toString();
    userToken = getTestToken(userId);

    const org = await Organization.create({
      name: 'Strategy Org',
      createdBy: userId,
    });
    orgId = org._id.toString();

    await Membership.create({
      user: userId,
      organization: orgId,
      role: 'owner',
    });

    const project = await Project.create({
      name: 'Strategic Project',
      organization: orgId,
      createdBy: userId,
    });
    projectId = project._id.toString();
  });

  it('should create and list a portfolio with project progress summary', async () => {
    await Task.create([
      {
        title: 'Done Task',
        status: 'done',
        project: projectId,
        organization: orgId,
        reporter: userId,
      },
      {
        title: 'Open Task',
        status: 'todo',
        project: projectId,
        organization: orgId,
        reporter: userId,
      },
    ]);

    const createRes = await request(app)
      .post('/api/portfolios')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Company Bets',
        orgId,
        projects: [projectId],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('Company Bets');
    expect(createRes.body.totalTasks).toBe(2);
    expect(createRes.body.progress).toBe(50);

    const listRes = await request(app)
      .get(`/api/portfolios?orgId=${orgId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].projects[0].name).toBe('Strategic Project');
  });

  it('should update and delete a portfolio', async () => {
    const portfolio = await Portfolio.create({
      name: 'Old Portfolio',
      organization: orgId,
      owner: userId,
      projects: [projectId],
    });

    const updateRes = await request(app)
      .put(`/api/portfolios/${portfolio._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({ name: 'Updated Portfolio', status: 'at-risk' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Updated Portfolio');
    expect(updateRes.body.status).toBe('at-risk');

    const deleteRes = await request(app)
      .delete(`/api/portfolios/${portfolio._id}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(deleteRes.status).toBe(200);
    expect(await Portfolio.findById(portfolio._id)).toBeNull();
  });

  it('should calculate portfolio progress using each project custom done status', async () => {
    await Project.findByIdAndUpdate(projectId, {
      workflowStatuses: [
        { id: 'queued', label: 'Queued', order: 0 },
        { id: 'shipped', label: 'Shipped', order: 1, isDone: true },
      ],
    });

    await Task.create([
      {
        title: 'Shipped work',
        status: 'shipped',
        project: projectId,
        organization: orgId,
        reporter: userId,
      },
      {
        title: 'Queued work',
        status: 'queued',
        project: projectId,
        organization: orgId,
        reporter: userId,
      },
    ]);

    const res = await request(app)
      .post('/api/portfolios')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Workflow Portfolio',
        orgId,
        projects: [projectId],
      });

    expect(res.status).toBe(201);
    expect(res.body.totalTasks).toBe(2);
    expect(res.body.completedTasks).toBe(1);
    expect(res.body.progress).toBe(50);
  });

  it('should create, update, list, and delete goals', async () => {
    const createRes = await request(app)
      .post('/api/goals')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        title: 'Increase activation',
        description: 'Improve onboarding conversion',
        orgId,
        progress: 25,
        linkedProjects: [projectId],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.title).toBe('Increase activation');
    expect(createRes.body.progress).toBe(25);

    const updateRes = await request(app)
      .put(`/api/goals/${createRes.body._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({ progress: 80, status: 'on-track' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.progress).toBe(80);

    const listRes = await request(app)
      .get(`/api/goals?orgId=${orgId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(listRes.status).toBe(200);
    expect(listRes.body[0].linkedProjects[0].name).toBe('Strategic Project');

    const deleteRes = await request(app)
      .delete(`/api/goals/${createRes.body._id}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(deleteRes.status).toBe(200);
    expect(await Goal.findById(createRes.body._id)).toBeNull();
  });

  it('should calculate goal progress from linked projects and tasks', async () => {
    await Project.findByIdAndUpdate(projectId, {
      workflowStatuses: [
        { id: 'queued', label: 'Queued', order: 0 },
        { id: 'shipped', label: 'Shipped', order: 1, isDone: true },
      ],
    });

    const linkedTask = await Task.create({
      title: 'Standalone linked task',
      status: 'done',
      project: projectId,
      organization: orgId,
      reporter: userId,
    });

    await Task.create([
      {
        title: 'Project complete',
        status: 'shipped',
        project: projectId,
        organization: orgId,
        reporter: userId,
      },
      {
        title: 'Project open',
        status: 'queued',
        project: projectId,
        organization: orgId,
        reporter: userId,
      },
    ]);

    const goal = await Goal.create({
      title: 'Ship strategic work',
      organization: orgId,
      owner: userId,
      linkedProjects: [projectId],
      linkedTasks: [linkedTask._id],
    });

    const res = await request(app)
      .get(`/api/goals?orgId=${orgId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(res.status).toBe(200);
    const returnedGoal = res.body.find((item: any) => item._id === goal._id.toString());
    expect(returnedGoal.linkedWorkTotal).toBe(4);
    expect(returnedGoal.linkedWorkCompleted).toBe(2);
    expect(returnedGoal.linkedWorkProgress).toBe(50);
  });
});
