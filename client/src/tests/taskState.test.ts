import { describe, expect, it } from 'vitest';
import {
  getBlockingDependents,
  getDependencyScheduleConflicts,
  getIncompleteDependencies,
  isTaskBlocked,
} from '../utils/taskState';

describe('taskState helpers', () => {
  it('returns only unfinished dependencies', () => {
    const dependencies = [
      { _id: 'dep-1', title: 'Ready', status: 'done' },
      { _id: 'dep-2', title: 'Waiting on QA', status: 'review' },
      { _id: 'dep-3', title: 'Waiting on API', status: 'todo' },
    ];

    expect(getIncompleteDependencies({ dependencies }).map((dependency) => dependency.title)).toEqual([
      'Waiting on QA',
      'Waiting on API',
    ]);
  });

  it('marks unfinished dependency chains as blocked unless the task is done', () => {
    expect(isTaskBlocked({
      status: 'todo',
      dependencies: [{ _id: 'dep-1', title: 'Waiting on QA', status: 'review' }],
    })).toBe(true);

    expect(isTaskBlocked({
      status: 'done',
      dependencies: [{ _id: 'dep-1', title: 'Waiting on QA', status: 'review' }],
    })).toBe(false);
  });

  it('finds tasks that are blocked by the current task', () => {
    const current = { _id: 'task-1', status: 'todo' };
    const tasks = [
      current,
      { _id: 'task-2', status: 'todo', dependencies: [{ _id: 'task-1', status: 'todo' }] },
      { _id: 'task-3', status: 'done', dependencies: [{ _id: 'task-1', status: 'todo' }] },
      { _id: 'task-4', status: 'todo', dependencies: [{ _id: 'other', status: 'todo' }] },
    ];

    expect(getBlockingDependents(current, tasks).map((task) => task._id)).toEqual(['task-2']);
  });

  it('detects schedule conflicts when blockers finish after task start', () => {
    const conflicts = getDependencyScheduleConflicts({
      startDate: '2026-05-20T00:00:00.000Z',
      dependencies: [
        { _id: 'dep-1', title: 'API', status: 'todo', dueDate: '2026-05-22T00:00:00.000Z' },
        { _id: 'dep-2', title: 'Done', status: 'done', dueDate: '2026-05-25T00:00:00.000Z' },
        { _id: 'dep-3', title: 'Early', status: 'todo', dueDate: '2026-05-18T00:00:00.000Z' },
      ],
    });

    expect(conflicts.map((dependency) => dependency._id)).toEqual(['dep-1']);
  });
});
