import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SortableTask } from '../components/SortableTask';

const baseTask = {
  _id: 'task-1',
  title: 'Review onboarding flow',
  status: 'todo',
  priority: 'medium',
  tags: [],
  dependencies: [],
};

function renderSortableTask(props = {}) {
  return render(
    <DndContext>
      <SortableContext items={[baseTask._id]}>
        <SortableTask task={baseTask} onClick={vi.fn()} {...props} />
      </SortableContext>
    </DndContext>,
  );
}

describe('SortableTask', () => {
  it('shows quick actions from the card menu', async () => {
    const onSetPriority = vi.fn();
    const onSetStatus = vi.fn();
    const onArchiveTask = vi.fn();
    const onCopyTaskLink = vi.fn();

    renderSortableTask({
      onSetPriority,
      onSetStatus,
      statusOptions: [
        { id: 'todo', label: 'To Do' },
        { id: 'review', label: 'Review' },
      ],
      onArchiveTask,
      onCopyTaskLink,
    });

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /copy link/i }));
    expect(onCopyTaskLink).toHaveBeenCalledWith(baseTask);

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.hover(screen.getByRole('menuitem', { name: /priority/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /high/i }));
    expect(onSetPriority).toHaveBeenCalledWith(baseTask, 'high');

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.hover(screen.getByRole('menuitem', { name: /status/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /review/i }));
    expect(onSetStatus).toHaveBeenCalledWith(baseTask, 'review');

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /archive/i }));
    expect(onArchiveTask).toHaveBeenCalledWith(baseTask);
  });
});
