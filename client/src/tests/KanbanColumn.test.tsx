import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KanbanColumn } from '../components/KanbanColumn';

function makeTask(index: number) {
  return {
    _id: `task-${index}`,
    title: `Task ${index}`,
    status: 'todo',
    priority: 'medium',
    tags: [],
    dependencies: [],
  };
}

function renderColumn(tasks = Array.from({ length: 45 }, (_, index) => makeTask(index + 1))) {
  return render(
    <DndContext>
      <KanbanColumn
        column={{ id: 'todo', label: 'To Do' }}
        tasks={tasks}
        selectedTasks={new Set()}
        onTaskClick={vi.fn()}
      />
    </DndContext>,
  );
}

describe('KanbanColumn', () => {
  it('progressively reveals large task columns to reduce initial render cost', async () => {
    renderColumn();

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 40')).toBeInTheDocument();
    expect(screen.queryByText('Task 41')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show 5 more tasks/i }));

    expect(screen.getByText('Task 41')).toBeInTheDocument();
    expect(screen.getByText('Task 45')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show/i })).not.toBeInTheDocument();
  });
});
