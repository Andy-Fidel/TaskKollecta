import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, getTestToken } from './setup';
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import Project from '../models/Project';

describe('Product analytics API', () => {
  let user: any;
  let token: string;
  let org: any;
  let project: any;

  beforeEach(async () => {
    user = await User.create({
      name: 'Metrics User',
      email: 'metrics@test.com',
      password: 'password123',
    });
    token = getTestToken(user._id.toString());

    org = await Organization.create({
      name: 'Metrics Org',
      createdBy: user._id,
    });

    await Membership.create({
      user: user._id,
      organization: org._id,
      role: 'owner',
    });

    project = await Project.create({
      name: 'Metrics Project',
      organization: org._id,
      createdBy: user._id,
    });
  });

  it('records product events and returns workspace adoption counts', async () => {
    const createOne = await request(app)
      .post('/api/analytics/events')
      .set('Cookie', [`jwt=${token}`])
      .send({
        eventName: 'my_tasks_task_completed',
        organizationId: org._id.toString(),
        projectId: project._id.toString(),
        metadata: { view: 'today' },
      });

    const createTwo = await request(app)
      .post('/api/analytics/events')
      .set('Cookie', [`jwt=${token}`])
      .send({
        eventName: 'command_workspace_switched',
        organizationId: org._id.toString(),
        metadata: { workspaceName: org.name },
      });

    expect(createOne.status).toBe(201);
    expect(createTwo.status).toBe(201);

    const summary = await request(app)
      .get(`/api/analytics/product-adoption?orgId=${org._id.toString()}`)
      .set('Cookie', [`jwt=${token}`]);

    expect(summary.status).toBe(200);
    expect(summary.body.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventName: 'my_tasks_task_completed', count: 1 }),
        expect.objectContaining({ eventName: 'command_workspace_switched', count: 1 }),
      ]),
    );
    expect(summary.body.activationScore).toBeGreaterThanOrEqual(0);
    expect(summary.body.activationSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'help_wizard_opened', completed: false }),
        expect.objectContaining({ id: 'setup_checklist_action_clicked', completed: false }),
      ]),
    );
    expect(summary.body.helpEngagement).toMatchObject({
      opened: 0,
      pathsSelected: 0,
      workflowsOpened: 0,
    });
  });

  it('returns activation milestones and help engagement summary', async () => {
    const events = [
      { eventName: 'help_wizard_opened', metadata: {} },
      { eventName: 'help_wizard_path_selected', metadata: { pathId: 'focus' } },
      { eventName: 'help_wizard_workflow_opened', metadata: { pathId: 'focus', route: '/tasks' } },
      { eventName: 'setup_checklist_action_clicked', metadata: { itemId: 'create-project' } },
      { eventName: 'onboarding_milestone_completed', metadata: { milestone: 'first_project_created' } },
      { eventName: 'onboarding_milestone_completed', metadata: { milestone: 'first_saved_view_created' } },
    ];

    for (const event of events) {
      const response = await request(app)
        .post('/api/analytics/events')
        .set('Cookie', [`jwt=${token}`])
        .send({
          ...event,
          organizationId: org._id.toString(),
        });
      expect(response.status).toBe(201);
    }

    const summary = await request(app)
      .get(`/api/analytics/product-adoption?orgId=${org._id.toString()}`)
      .set('Cookie', [`jwt=${token}`]);

    expect(summary.status).toBe(200);
    expect(summary.body.activationScore).toBe(80);
    expect(summary.body.activationSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'first_project_created', completed: true, count: 1 }),
        expect.objectContaining({ id: 'saved_view_created', completed: true, count: 1 }),
        expect.objectContaining({ id: 'help_wizard_opened', completed: true, count: 1 }),
        expect.objectContaining({ id: 'setup_checklist_action_clicked', completed: true, count: 1 }),
      ]),
    );
    expect(summary.body.helpEngagement).toMatchObject({
      opened: 1,
      pathsSelected: 1,
      workflowsOpened: 1,
    });
  });
});
