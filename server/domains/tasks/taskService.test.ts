import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../tests/setup';
import User from '../../models/User';
import Organization from '../../models/Organization';
import Membership from '../../models/Membership';
import Project from '../../models/Project';
import Task from '../../models/Task';

vi.mock('../../utils/notificationService', () => ({
  sendNotification: vi.fn(),
  sendTaskAssignmentEmail: vi.fn(),
  sendExternalTaskAssignmentEmail: vi.fn(),
  sendStatusChangeEmail: vi.fn(),
}));

vi.mock('../../utils/activityLogger', () => ({
  logActivity: vi.fn(),
}));

vi.mock('../../utils/automationEngine', () => vi.fn());

vi.mock('../../utils/cacheUtils', () => ({
  invalidateTaskCache: vi.fn(),
}));

const taskService = require('./taskService');

describe('taskService', () => {
  let user: any;
  let org: any;
  let project: any;

  beforeEach(async () => {
    user = await User.create({
      name: 'Service User',
      email: 'service-task@test.com',
      password: 'password123',
    });

    org = await Organization.create({
      name: 'Service Org',
      createdBy: user._id,
    });

    await Membership.create({
      user: user._id,
      organization: org._id,
      role: 'owner',
    });

    project = await Project.create({
      name: 'Service Project',
      organization: org._id,
      createdBy: user._id,
    });
  });

  it('blocks task completion when dependencies are not done', async () => {
    const blocker = await Task.create({
      title: 'Blocking Task',
      status: 'in-progress',
      project: project._id,
      organization: org._id,
      reporter: user._id,
    });

    const task = await Task.create({
      title: 'Blocked Task',
      status: 'todo',
      project: project._id,
      organization: org._id,
      reporter: user._id,
      dependencies: [blocker._id],
    });

    await expect(
      taskService.updateTask({
        taskId: task._id.toString(),
        body: { status: 'done' },
        user,
        io: { to: vi.fn(() => ({ emit: vi.fn() })) },
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Blocking Task'),
    });
  });

  it('returns paginated project tasks with metadata', async () => {
    await Task.create([
      {
        title: 'Task A',
        project: project._id,
        organization: org._id,
        reporter: user._id,
        index: 1,
      },
      {
        title: 'Task B',
        project: project._id,
        organization: org._id,
        reporter: user._id,
        index: 2,
      },
    ]);

    const result = await taskService.getProjectTasks({
      projectId: project._id.toString(),
      userId: user._id,
      query: { page: '0', limit: '1' },
    });

    expect(result.tasks).toHaveLength(1);
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.hasMore).toBe(true);
  });
});
