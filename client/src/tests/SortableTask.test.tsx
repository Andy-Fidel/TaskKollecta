import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('shows quick actions from the card menu', async () => {
    const onRenameTask = vi.fn().mockResolvedValue(true);
    const onSetPriority = vi.fn();
    const onSetStatus = vi.fn();
    const onSetAssignee = vi.fn();
    const onSetDueDate = vi.fn();
    const onArchiveTask = vi.fn();
    const onCopyTaskLink = vi.fn();

    renderSortableTask({
      onSetPriority,
      onRenameTask,
      onSetStatus,
      statusOptions: [
        { id: 'todo', label: 'To Do' },
        { id: 'review', label: 'Review' },
      ],
      members: [
        { role: 'member', user: { _id: 'user-2', name: 'Mina', avatar: '' } },
      ],
      onSetAssignee,
      onSetDueDate,
      onArchiveTask,
      onCopyTaskLink,
    });

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /copy link/i }));
    expect(onCopyTaskLink).toHaveBeenCalledWith(baseTask);

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /rename/i }));
    const titleInput = screen.getByLabelText(/rename review onboarding flow/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Review invite flow');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onRenameTask).toHaveBeenCalledWith(baseTask, 'Review invite flow');

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.hover(screen.getByRole('menuitem', { name: /priority/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /high/i }));
    expect(onSetPriority).toHaveBeenCalledWith(baseTask, 'high');

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.hover(screen.getByRole('menuitem', { name: /status/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /review/i }));
    expect(onSetStatus).toHaveBeenCalledWith(baseTask, 'review');

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.hover(screen.getByRole('menuitem', { name: /assignee/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /mina/i }));
    expect(onSetAssignee).toHaveBeenCalledWith(baseTask, {
      role: 'member',
      user: { _id: 'user-2', name: 'Mina', avatar: '' },
    });

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.hover(screen.getByRole('menuitem', { name: /due date/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /tomorrow/i }));
    expect(onSetDueDate).toHaveBeenCalledWith(baseTask, expect.any(Date));

    await userEvent.click(screen.getByRole('button', { name: /task actions for review onboarding flow/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /archive/i }));
    expect(onArchiveTask).toHaveBeenCalledWith(baseTask);
  });

  it('shows an aging indicator for tasks without recent updates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:00:00.000Z'));

    renderSortableTask({
      task: {
        ...baseTask,
        updatedAt: '2026-05-08T12:00:00.000Z',
      },
      statusOptions: [
        { id: 'todo', label: 'To Do', isDone: false },
      ],
    });

    expect(screen.getByText(/no update 10d/i)).toBeInTheDocument();
  });

  it('shows dependency impact indicators on cards', () => {
    renderSortableTask({
      blockingCount: 2,
      scheduleConflictCount: 1,
    });

    expect(screen.getByText(/blocking 2/i)).toBeInTheDocument();
    expect(screen.getByText(/date risk/i)).toBeInTheDocument();
  });
});
