import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SortableTask } from '../components/SortableTask';

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

describe('SortableTask', () => {
  it('shows blocked state and blocker titles when dependencies are incomplete', () => {
    render(
      <SortableTask
        task={{
          _id: 'task-1',
          title: 'Ship release',
          status: 'todo',
          priority: 'high',
          dependencies: [
            { _id: 'dep-1', title: 'QA signoff', status: 'review' },
            { _id: 'dep-2', title: 'Legal approval', status: 'done' },
          ],
          tags: [],
        }}
        onClick={() => {}}
        isSelected={false}
        onToggleSelect={() => {}}
      />,
    );

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText(/waiting on 1 blocker/i)).toBeInTheDocument();
    expect(screen.getByText(/QA signoff/i)).toBeInTheDocument();
  });
});
