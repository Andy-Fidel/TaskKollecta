import { describe, expect, it } from 'vitest';
import { getIncompleteDependencies, isTaskBlocked } from '../utils/taskState';

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
});
