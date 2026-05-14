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
        filters: {
          statuses: ['approved'],
          priorities: ['high'],
          customFields: {
            client: 'Acme',
            approved: true,
          },
        },
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.filters.statuses).toEqual(['approved']);
    expect(createRes.body.filters.customFields).toMatchObject({ client: 'Acme', approved: true });

    const listRes = await request(app)
      .get(`/api/filter-presets/project/${projectId}`)
      .set('Cookie', [`jwt=${userToken}`]);

    expect(listRes.status).toBe(200);
    expect(listRes.body[0].filters.statuses).toEqual(['approved']);
    expect(listRes.body[0].filters.customFields).toMatchObject({ client: 'Acme', approved: true });
  });
});
