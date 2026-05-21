import { it, expect, describe, beforeEach } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from '../../tests/setup';
import User from '../../models/User';
import Organization from '../../models/Organization';
import Membership from '../../models/Membership';
import Project from '../../models/Project';
import Task from '../../models/Task';
import Portfolio from '../../models/Portfolio';

describe('Projects API — CRUD and management', () => {
  let userToken: string;
  let userId: string;
  let memberToken: string;
  let memberId: string;
  let orgId: string;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Project User',
      email: 'project@test.com',
      password: 'password123',
    });
    userId = user._id.toString();
    userToken = getTestToken(userId);

    const member = await User.create({
      name: 'Project Member',
      email: 'project-member@test.com',
      password: 'password123',
    });
    memberId = member._id.toString();
    memberToken = getTestToken(memberId);

    const org = await Organization.create({
      name: 'Project Org',
      createdBy: userId,
    });
    orgId = org._id.toString();

    await Membership.create([
      { user: userId, organization: orgId, role: 'owner' },
      { user: memberId, organization: orgId, role: 'member' },
    ]);
  });

  it('should create a new project with members, dates, seed tasks, and portfolio assignment successfully', async () => {
    const portfolio = await Portfolio.create({
      name: 'Launch Portfolio',
      organization: orgId,
      owner: userId,
      projects: [],
    });

    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'New Project',
        description: 'Test project description',
        brief: {
          purpose: 'Launch a reliable beta',
          successCriteria: 'Beta customers complete onboarding',
          statusCadence: 'weekly',
          resources: [{ label: 'Spec', url: 'https://example.com/spec' }],
          milestones: [{ title: 'Beta launch', dueDate: '2026-06-15T00:00:00.000Z' }],
        },
        orgId,
        startDate: '2026-06-01T00:00:00.000Z',
        dueDate: '2026-06-30T00:00:00.000Z',
        members: [memberId],
        portfolioIds: [portfolio._id.toString()],
        seedTasks: [
          { title: 'Kickoff', priority: 'high' },
          { title: 'Launch checklist', priority: 'medium' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Project');
    expect(res.body.startDate).toBeTruthy();
    expect(res.body.brief.purpose).toBe('Launch a reliable beta');
    expect(res.body.brief.resources[0].label).toBe('Spec');
    expect(res.body.brief.milestones[0].title).toBe('Beta launch');
    expect(res.body.members.map((member: any) => member.user._id)).toEqual(expect.arrayContaining([userId, memberId]));
    expect(res.body.workflowStatuses.map((status: any) => status.id)).toEqual(['todo', 'in-progress', 'review', 'done']);

    const tasks = await Task.find({ project: res.body._id });
    expect(tasks).toHaveLength(2);

    const refreshedPortfolio = await Portfolio.findById(portfolio._id);
    expect(refreshedPortfolio?.projects.map((projectId) => projectId.toString())).toContain(res.body._id);
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

  it('should enforce private project access for regular organization members', async () => {
    const publicProject = await Project.create({
      name: 'Visible Public Project',
      organization: orgId,
      createdBy: userId,
      privacy: 'public',
    });
    const privateProject = await Project.create({
      name: 'Hidden Private Project',
      organization: orgId,
      createdBy: userId,
      privacy: 'private',
      members: [{ user: userId, role: 'owner' }],
    });
    const sharedPrivateProject = await Project.create({
      name: 'Shared Private Project',
      organization: orgId,
      createdBy: userId,
      privacy: 'private',
      members: [{ user: userId, role: 'owner' }, { user: memberId, role: 'editor' }],
    });

    const listRes = await request(app)
      .get('/api/projects')
      .set('Cookie', [`jwt=${memberToken}`])
      .set('x-active-org', orgId);

    expect(listRes.status).toBe(200);
    expect(listRes.body.map((project: any) => project._id)).toEqual(expect.arrayContaining([
      publicProject._id.toString(),
      sharedPrivateProject._id.toString(),
    ]));
    expect(listRes.body.map((project: any) => project._id)).not.toContain(privateProject._id.toString());

    const hiddenDetails = await request(app)
      .get(`/api/projects/single/${privateProject._id}`)
      .set('Cookie', [`jwt=${memberToken}`]);
    expect(hiddenDetails.status).toBe(404);
  });

  it('should enforce organization guest access settings and keep guests read-only', async () => {
    const guest = await User.create({
      name: 'Project Guest',
      email: 'project-guest@test.com',
      password: 'password123',
    });
    const guestToken = getTestToken(guest._id.toString());

    await Membership.create({ user: guest._id, organization: orgId, role: 'guest' });
    const project = await Project.create({
      name: 'Guest Visible Project',
      organization: orgId,
      createdBy: userId,
      privacy: 'public',
    });

    const blockedList = await request(app)
      .get(`/api/projects/${orgId}`)
      .set('Cookie', [`jwt=${guestToken}`]);
    expect(blockedList.status).toBe(200);
    expect(blockedList.body).toEqual([]);

    const blockedDetails = await request(app)
      .get(`/api/projects/single/${project._id}`)
      .set('Cookie', [`jwt=${guestToken}`]);
    expect(blockedDetails.status).toBe(404);

    await Organization.findByIdAndUpdate(orgId, {
      defaultProjectSettings: {
        allowGuestAccess: true,
        requireApprovalToJoin: true,
      },
    });

    const allowedList = await request(app)
      .get(`/api/projects/${orgId}`)
      .set('Cookie', [`jwt=${guestToken}`]);
    expect(allowedList.status).toBe(200);
    expect(allowedList.body.map((item: any) => item._id)).toContain(project._id.toString());

    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', [`jwt=${guestToken}`])
      .send({ name: 'Guest Project', orgId });
    expect(createRes.status).toBe(403);

    const updateRes = await request(app)
      .put(`/api/projects/${project._id}`)
      .set('Cookie', [`jwt=${guestToken}`])
      .send({ name: 'Guest Edit' });
    expect(updateRes.status).toBe(403);
  });

  it('should filter and sort projects on the server', async () => {
    await Project.create([
      {
        name: 'Zulu Private',
        organization: orgId,
        createdBy: userId,
        privacy: 'private',
        lead: userId,
        members: [{ user: userId, role: 'owner' }],
      },
      {
        name: 'Alpha Private',
        organization: orgId,
        createdBy: userId,
        privacy: 'private',
        lead: userId,
        members: [{ user: userId, role: 'owner' }],
      },
      {
        name: 'Public Other Lead',
        organization: orgId,
        createdBy: userId,
        privacy: 'public',
        lead: memberId,
      },
    ]);

    const res = await request(app)
      .get(`/api/projects?privacy=private&lead=${userId}&sort=name`)
      .set('Cookie', [`jwt=${userToken}`])
      .set('x-active-org', orgId);

    expect(res.status).toBe(200);
    expect(res.body.map((project: any) => project.name)).toEqual(['Alpha Private', 'Zulu Private']);
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

  it('should update project brief and status cadence', async () => {
    const project = await Project.create({
      name: 'Brief Project',
      organization: orgId,
      createdBy: userId,
    });

    const res = await request(app)
      .put(`/api/projects/${project._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        brief: {
          purpose: 'Clarify the operating plan',
          successCriteria: 'Stakeholders agree on launch readiness',
          statusCadence: 'biweekly',
          resources: [{ label: 'Plan', url: 'https://example.com/plan' }],
          milestones: [{ title: 'Readiness review', dueDate: '2026-07-10T00:00:00.000Z' }],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.brief.purpose).toBe('Clarify the operating plan');
    expect(res.body.brief.statusCadence).toBe('biweekly');
    expect(res.body.brief.resources[0].url).toBe('https://example.com/plan');
    expect(res.body.brief.milestones[0].title).toBe('Readiness review');
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

  it('should duplicate task dependencies and planning fields from a template project', async () => {
    const portfolio = await Portfolio.create({
      name: 'Template Portfolio',
      organization: orgId,
      owner: userId,
      projects: [],
    });
    const source = await Project.create({
      name: 'Template Source',
      organization: orgId,
      createdBy: userId,
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      dueDate: new Date('2026-07-31T00:00:00.000Z'),
      privacy: 'private',
      brief: {
        purpose: 'Reusable launch plan',
        successCriteria: 'Launch checklist completed',
        statusCadence: 'monthly',
        milestones: [{ title: 'Template milestone', dueDate: new Date('2026-07-05T00:00:00.000Z') }],
      },
      members: [{ user: userId, role: 'owner' }, { user: memberId, role: 'editor' }],
      isTemplate: true,
    });
    const firstTask = await Task.create({
      title: 'First template task',
      organization: orgId,
      project: source._id,
      reporter: userId,
      status: 'todo',
      startDate: new Date('2026-07-02T00:00:00.000Z'),
      dueDate: new Date('2026-07-03T00:00:00.000Z'),
      subtasks: [{ title: 'Subtask', isCompleted: false }],
      isMilestone: true,
    });
    await Task.create({
      title: 'Second template task',
      organization: orgId,
      project: source._id,
      reporter: userId,
      status: 'todo',
      dependencies: [firstTask._id],
    });

    const res = await request(app)
      .post(`/api/projects/${source._id}/duplicate`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Template Copy',
        startDate: '2026-08-01T00:00:00.000Z',
        dueDate: '2026-08-31T00:00:00.000Z',
        lead: memberId,
        members: [memberId],
        portfolioIds: [portfolio._id.toString()],
      });

    expect(res.status).toBe(201);
    expect(new Date(res.body.startDate).toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(new Date(res.body.dueDate).toISOString()).toBe('2026-08-31T00:00:00.000Z');
    expect(res.body.brief.purpose).toBe('Reusable launch plan');
    expect(new Date(res.body.brief.milestones[0].dueDate).toISOString()).toBe('2026-08-05T00:00:00.000Z');
    expect(res.body.lead?.toString?.() || res.body.lead).toBe(memberId);

    const copiedTasks = await Task.find({ project: res.body._id }).sort({ title: 1 });
    expect(copiedTasks).toHaveLength(2);
    expect(copiedTasks[0].isMilestone).toBe(true);
    expect(copiedTasks[0].subtasks).toHaveLength(1);
    expect(copiedTasks[0].startDate?.toISOString()).toBe('2026-08-02T00:00:00.000Z');
    expect(copiedTasks[0].dueDate?.toISOString()).toBe('2026-08-03T00:00:00.000Z');
    expect(copiedTasks[1].dependencies.map((dependencyId) => dependencyId.toString())).toEqual([copiedTasks[0]._id.toString()]);

    const refreshedPortfolio = await Portfolio.findById(portfolio._id);
    expect(refreshedPortfolio?.projects.map((projectId) => projectId.toString())).toContain(res.body._id);
  });
});
