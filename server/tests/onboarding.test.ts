import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../utils/sendEmail', () => vi.fn().mockResolvedValue(undefined));

import { app, getTestToken } from './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import Project from '../models/Project';
import Task from '../models/Task';
import Invite from '../models/Invite';
import ProductEvent from '../models/ProductEvent';

describe('Onboarding API', () => {
  it('saves draft progress for resumable onboarding', async () => {
    const user = await User.create({
      name: 'Draft User',
      email: 'draft-onboarding@test.com',
      password: 'password123',
    });
    const token = getTestToken(user._id.toString());

    const response = await request(app)
      .put('/api/users/onboarding/progress')
      .set('Cookie', [`jwt=${token}`])
      .send({
        currentStep: 2,
        role: 'team_lead',
        organizationName: 'Draft Workspace',
        projectName: 'Draft Project',
        inviteEmails: ['Teammate@Test.com'],
      });

    expect(response.status).toBe(200);

    const refreshed = await User.findById(user._id);
    expect(refreshed?.onboardingData?.currentStep).toBe(2);
    expect(refreshed?.onboardingData?.role).toBe('team_lead');
    expect(refreshed?.onboardingData?.draft?.organizationName).toBe('Draft Workspace');
    expect(refreshed?.onboardingData?.draft?.inviteEmails).toEqual(['teammate@test.com']);
  });

  it('validates onboarding role and invite email payloads', async () => {
    const user = await User.create({
      name: 'Invalid User',
      email: 'invalid-onboarding@test.com',
      password: 'password123',
    });
    const token = getTestToken(user._id.toString());

    const response = await request(app)
      .post('/api/users/onboarding')
      .set('Cookie', [`jwt=${token}`])
      .send({
        role: 'executive',
        inviteEmails: ['not-an-email'],
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'role' }),
        expect.objectContaining({ field: 'inviteEmails[0]' }),
      ]),
    );
  });

  it('provisions creator onboarding with starter data, real invites, and product events', async () => {
    const user = await User.create({
      name: 'Creator User',
      email: 'creator-onboarding@test.com',
      password: 'password123',
    });
    const token = getTestToken(user._id.toString());

    const response = await request(app)
      .post('/api/users/onboarding')
      .set('Cookie', [`jwt=${token}`])
      .send({
        role: 'team_lead',
        organizationName: 'Creator Workspace',
        projectName: 'Launch Board',
        inviteEmails: ['member1@test.com', 'member1@test.com', 'member2@test.com'],
      });

    expect(response.status).toBe(200);
    expect(response.body.organization.name).toBe('Creator Workspace');
    expect(response.body.project.name).toBe('Launch Board');
    expect(response.body.invites.sent).toHaveLength(2);

    const refreshedUser = await User.findById(user._id);
    const organization = await Organization.findOne({ name: 'Creator Workspace' });
    const membership = await Membership.findOne({ user: user._id, organization: organization?._id });
    const project = await Project.findOne({ name: 'Launch Board', organization: organization?._id });
    const tasks = await Task.find({ project: project?._id });
    const invites = await Invite.find({ organization: organization?._id }).sort({ email: 1 });
    const events = await ProductEvent.find({ user: user._id, organization: organization?._id });

    expect(refreshedUser?.onboardingCompleted).toBe(true);
    expect(refreshedUser?.onboardingCompletedAt).toBeTruthy();
    expect(membership?.role).toBe('owner');
    expect(tasks.length).toBeGreaterThan(0);
    expect(invites.map((invite) => invite.email)).toEqual(['member1@test.com', 'member2@test.com']);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventName: 'onboarding_completed' }),
        expect.objectContaining({
          eventName: 'onboarding_milestone_completed',
          metadata: expect.objectContaining({ milestone: 'first_project_created' }),
        }),
      ]),
    );
  });

  it('does not create duplicate workspaces when completion is retried', async () => {
    const user = await User.create({
      name: 'Retry User',
      email: 'retry-onboarding@test.com',
      password: 'password123',
    });
    const token = getTestToken(user._id.toString());

    const payload = {
      role: 'personal',
      organizationName: 'Retry Workspace',
      projectName: 'Retry Planner',
    };

    const first = await request(app)
      .post('/api/users/onboarding')
      .set('Cookie', [`jwt=${token}`])
      .send(payload);
    const second = await request(app)
      .post('/api/users/onboarding')
      .set('Cookie', [`jwt=${token}`])
      .send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.message).toBe('Onboarding already completed');
    expect(await Organization.countDocuments({ name: 'Retry Workspace' })).toBe(1);
  });
});
