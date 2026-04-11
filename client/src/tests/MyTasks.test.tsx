import { describe, expect, it } from 'vitest';
import { filterTasksForView, getTaskTriageMeta } from '../pages/MyTasks';

const now = new Date('2026-04-09T09:00:00.000Z');

function buildTask(overrides = {}) {
  return {
    _id: crypto.randomUUID(),
    title: 'Task',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    project: { _id: 'project-1', name: 'Core Product' },
    dependencies: [],
    ...overrides,
  };
}

describe('MyTasks triage helpers', () => {
  it('classifies overdue, blocked, upcoming, and completed tasks into sections', () => {
    const overdue = getTaskTriageMeta(buildTask({ dueDate: '2026-04-08T12:00:00.000Z' }), now);
    const blocked = getTaskTriageMeta(buildTask({
      title: 'Blocked Task',
      dependencies: [{ _id: 'dep-1', title: 'Waiting on API', status: 'in-progress' }],
    }), now);
    const upcoming = getTaskTriageMeta(buildTask({ dueDate: '2026-04-12T09:00:00.000Z' }), now);
    const done = getTaskTriageMeta(buildTask({ status: 'done', dueDate: '2026-04-01T09:00:00.000Z' }), now);

    expect(overdue.section).toBe('overdue');
    expect(blocked.section).toBe('blocked');
    expect(blocked.blockers).toHaveLength(1);
    expect(upcoming.section).toBe('upcoming');
    expect(done.section).toBe('done');
  });

  it('filters the today saved view to due-today and overdue work', () => {
    const tasks = [
      buildTask({ title: 'Overdue', dueDate: '2026-04-08T12:00:00.000Z' }),
      buildTask({ title: 'Today', dueDate: '2026-04-09T18:00:00.000Z' }),
      buildTask({
        title: 'Blocked',
        dependencies: [{ _id: 'dep-1', title: 'Dependency', status: 'review' }],
      }),
      buildTask({ title: 'Upcoming', dueDate: '2026-04-15T18:00:00.000Z' }),
    ];

    const visible = filterTasksForView(tasks, {
      view: 'today',
      priority: 'all',
      project: 'all',
      query: '',
    });

    expect(visible.map((task) => task.title)).toEqual(['Overdue', 'Today']);
  });

  it('filters the attention saved view to blocked and high-signal tasks', () => {
    const tasks = [
      buildTask({ title: 'Blocked', dependencies: [{ _id: 'dep-1', title: 'Dependency', status: 'todo' }] }),
      buildTask({ title: 'Urgent', priority: 'urgent' }),
      buildTask({ title: 'Upcoming', dueDate: '2026-04-15T18:00:00.000Z', priority: 'low' }),
    ];

    const visible = filterTasksForView(tasks, {
      view: 'attention',
      priority: 'all',
      project: 'all',
      query: '',
    });

    expect(visible.map((task) => task.title)).toEqual(['Blocked', 'Urgent']);
  });

  it('applies text, priority, and project filters on top of the saved view', () => {
    const tasks = [
      buildTask({
        title: 'Prepare launch notes',
        priority: 'high',
        project: { _id: 'project-2', name: 'Launch' },
        dependencies: [{ _id: 'dep-1', title: 'Content review', status: 'in-progress' }],
      }),
      buildTask({
        title: 'Fix dashboard chart',
        priority: 'high',
        project: { _id: 'project-1', name: 'Core Product' },
      }),
    ];

    const visible = filterTasksForView(tasks, {
      view: 'attention',
      priority: 'high',
      project: 'project-2',
      query: 'content',
    });

    expect(visible.map((task) => task.title)).toEqual(['Prepare launch notes']);
  });
});
