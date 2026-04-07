import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../tests/setup';
import User from '../../models/User';
import Organization from '../../models/Organization';
import Membership from '../../models/Membership';
import Project from '../../models/Project';
import Task from '../../models/Task';
import Comment from '../../models/Comment';
import Notification from '../../models/Notification';

const commentService = require('./commentService');

describe('commentService', () => {
  let author: any;
  let assignee: any;
  let mentioned: any;
  let org: any;
  let project: any;
  let task: any;

  beforeEach(async () => {
    author = await User.create({
      name: 'Comment Author',
      email: 'author-comment@test.com',
      password: 'password123',
    });

    assignee = await User.create({
      name: 'Assigned User',
      email: 'assignee-comment@test.com',
      password: 'password123',
    });

    mentioned = await User.create({
      name: 'John Mentioned',
      email: 'mentioned-comment@test.com',
      password: 'password123',
    });

    org = await Organization.create({
      name: 'Comment Org',
      createdBy: author._id,
    });

    await Membership.create([
      { user: author._id, organization: org._id, role: 'owner' },
      { user: assignee._id, organization: org._id, role: 'member' },
      { user: mentioned._id, organization: org._id, role: 'member' },
    ]);

    project = await Project.create({
      name: 'Comment Project',
      organization: org._id,
      createdBy: author._id,
    });

    task = await Task.create({
      title: 'Comment Task',
      project: project._id,
      organization: org._id,
      reporter: author._id,
      assignee: assignee._id,
    });
  });

  it('creates a comment and emits assignee and mention notifications', async () => {
    const io = { to: vi.fn(() => ({ emit: vi.fn() })) };

    const result = await commentService.addComment({
      content: 'Please review this @John update',
      taskId: task._id.toString(),
      user: author,
      io,
    });

    expect(result.comment.content).toBe('Please review this @John update');

    await result.notify();

    expect(await Comment.countDocuments({ task: task._id })).toBe(1);

    const notifications = await Notification.find({ sender: author._id }).sort({ type: 1 });
    expect(notifications).toHaveLength(2);
    expect(notifications.map((notification) => notification.type).sort()).toEqual(['mention', 'new_comment']);
  });

  it('returns paginated comments oldest-first within a page', async () => {
    const first = await Comment.create({ content: 'First', task: task._id, user: author._id });
    const second = await Comment.create({ content: 'Second', task: task._id, user: author._id });
    const third = await Comment.create({ content: 'Third', task: task._id, user: author._id });

    await Comment.updateOne({ _id: first._id }, { $set: { createdAt: new Date('2026-01-01T00:00:00.000Z') } });
    await Comment.updateOne({ _id: second._id }, { $set: { createdAt: new Date('2026-01-02T00:00:00.000Z') } });
    await Comment.updateOne({ _id: third._id }, { $set: { createdAt: new Date('2026-01-03T00:00:00.000Z') } });

    const firstPage = await commentService.getTaskComments({
      taskId: task._id.toString(),
      limit: 2,
      before: undefined,
    });

    expect(firstPage.comments).toHaveLength(2);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.comments[0].content).toBe('Second');
    expect(firstPage.comments[1].content).toBe('Third');
  });
});
