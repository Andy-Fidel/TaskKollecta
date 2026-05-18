import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import Project from '../models/Project';

describe('Filter presets API', () => {
  let userToken: string;
  let userId: string;
  let teammateToken: string;
  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Filter User',
      email: 'filter@test.com',
      password: 'password123',
    });
    userId = user._id.toString();
    userToken = getTestToken(userId);

    const teammate = await User.create({
      name: 'Filter Teammate',
      email: 'filter-teammate@test.com',
      password: 'password123',
    });
    teammateToken = getTestToken(teammate._id.toString());

    const org = await Organization.create({
      name: 'Filter Org',
      createdBy: userId,
    });
    orgId = org._id.toString();

    await Membership.create({
      user: userId,
      organization: orgId,
      role: 'owner',
    });
    await Membership.create({
      user: teammate._id,
      organization: orgId,
      role: 'member',
    });

    const project = await Project.create({
      name: 'Filter Project',
      organization: orgId,
      createdBy: userId,
    });
    projectId = project._id.toString();
  });

  it('should save custom workflow statuses and custom field filters in presets', async () => {
    const createRes = await request(app)
      .post('/api/filter-presets')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Approved Acme',
        projectId,
        scope: 'project',
        visibility: 'private',
        layout: 'list',
        filters: {
          statuses: ['approved'],
          priorities: ['high'],
          query: 'Acme',
          blockedOnly: true,
          customFields: {
            client: 'Acme',
            approved: true,
          },
        },
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.scope).toBe('project');
    expect(createRes.body.visibility).toBe('private');
    expect(createRes.body.layout).toBe('list');
    expect(createRes.body.filters.statuses).toEqual(['approved']);
    expect(createRes.body.filters.query).toBe('Acme');
    expect(createRes.body.filters.blockedOnly).toBe(true);
    expect(createRes.body.filters.customFields).toMatchObject({ client: 'Acme', approved: true });

    const listRes = await request(app)
      .get(`/api/filter-presets/project/${projectId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(listRes.status).toBe(200);
    expect(listRes.body[0].filters.statuses).toEqual(['approved']);
    expect(listRes.body[0].filters.customFields).toMatchObject({ client: 'Acme', approved: true });
  });

  it('should expose team project saved views to organization teammates', async () => {
    const createRes = await request(app)
      .post('/api/filter-presets')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Blocked team work',
        projectId,
        visibility: 'team',
        filters: { blockedOnly: true },
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.visibility).toBe('team');

    const teammateListRes = await request(app)
      .get(`/api/filter-presets/project/${projectId}`)
      .set('Cookie', [`jwt=${teammateToken}`]);

    expect(teammateListRes.status).toBe(200);
    expect(teammateListRes.body).toHaveLength(1);
    expect(teammateListRes.body[0].name).toBe('Blocked team work');
  });

  it('should update, default, and duplicate saved views', async () => {
    const firstRes = await request(app)
      .post('/api/filter-presets')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Owner triage',
        projectId,
        visibility: 'private',
        layout: 'board',
        filters: { blockedOnly: true },
      });

    const secondRes = await request(app)
      .post('/api/filter-presets')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Timeline plan',
        projectId,
        visibility: 'private',
        layout: 'timeline',
        filters: { priorities: ['high'] },
      });

    const updateRes = await request(app)
      .put(`/api/filter-presets/${secondRes.body._id}`)
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Launch roadmap',
        visibility: 'team',
        isDefault: true,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Launch roadmap');
    expect(updateRes.body.visibility).toBe('team');
    expect(updateRes.body.isDefault).toBe(true);

    const listRes = await request(app)
      .get(`/api/filter-presets/project/${projectId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(listRes.status).toBe(200);
    expect(listRes.body[0].name).toBe('Launch roadmap');
    expect(listRes.body.find((view: any) => view._id === firstRes.body._id).isDefault).toBe(false);

    const duplicateRes = await request(app)
      .post(`/api/filter-presets/${secondRes.body._id}/duplicate`)
      .set('Cookie', [`jwt=${teammateToken}`])
      .send({ name: 'My launch roadmap' });

    expect(duplicateRes.status).toBe(201);
    expect(duplicateRes.body.name).toBe('My launch roadmap');
    expect(duplicateRes.body.visibility).toBe('private');
    expect(duplicateRes.body.layout).toBe('timeline');
    expect(duplicateRes.body.isDefault).toBe(false);
  });

  it('should save and list My Tasks saved views by organization', async () => {
    const createRes = await request(app)
      .post('/api/filter-presets')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Launch attention',
        orgId,
        scope: 'my_tasks',
        visibility: 'team',
        filters: {
          view: 'attention',
          priority: 'high',
          projectFilter: projectId,
          query: 'launch',
        },
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.scope).toBe('my_tasks');
    expect(createRes.body.layout).toBe('my_tasks');
    expect(createRes.body.filters.view).toBe('attention');
    expect(createRes.body.filters.priority).toBe('high');
    expect(createRes.body.filters.projectFilter).toBe(projectId);

    const listRes = await request(app)
      .get(`/api/filter-presets/my-tasks?orgId=${orgId}`)
      .set('Cookie', [`jwt=${teammateToken}`]);

    expect(listRes.status).toBe(200);
    expect(listRes.body[0].name).toBe('Launch attention');
    expect(listRes.body[0].filters.query).toBe('launch');
  });

  it('should list visible workspace saved views across project and My Tasks scopes', async () => {
    await request(app)
      .post('/api/filter-presets')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Team project view',
        projectId,
        visibility: 'team',
        layout: 'board',
        filters: { blockedOnly: true },
      });

    await request(app)
      .post('/api/filter-presets')
      .set('Cookie', [`jwt=${userToken}`])
      .send({
        name: 'Private triage',
        orgId,
        scope: 'my_tasks',
        visibility: 'private',
        filters: { view: 'attention' },
      });

    const ownerListRes = await request(app)
      .get(`/api/filter-presets/workspace?orgId=${orgId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(ownerListRes.status).toBe(200);
    expect(ownerListRes.body.map((view: any) => view.name)).toEqual(
      expect.arrayContaining(['Team project view', 'Private triage']),
    );
    expect(ownerListRes.body.find((view: any) => view.name === 'Team project view').project.name).toBe('Filter Project');

    const teammateListRes = await request(app)
      .get(`/api/filter-presets/workspace?orgId=${orgId}`)
      .set('Cookie', [`jwt=${teammateToken}`]);

    expect(teammateListRes.status).toBe(200);
    expect(teammateListRes.body.map((view: any) => view.name)).toContain('Team project view');
    expect(teammateListRes.body.map((view: any) => view.name)).not.toContain('Private triage');
  });
});
