import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, type Mocked } from 'vitest';
import { SmartFocusMode } from '../components/SmartFocusMode';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as Mocked<typeof api>;

describe('SmartFocusMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders focus tasks and performs start, reschedule, and subtask actions', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        focusTasks: [
          {
            taskId: 'task-1',
            title: 'Prepare sprint review',
            priority: 'high',
            focusReason: 'Due today',
            dueDate: '2026-04-09T15:00:00.000Z',
            status: 'todo',
            description: 'Collect notes and metrics.',
            project: { _id: 'project-1', name: 'Core Product' },
          },
        ],
      },
    });

    mockedApi.put.mockImplementation(async (url, body) => {
      if (url === '/tasks/task-1' && body?.status === 'in-progress') {
        return { data: { status: 'in-progress', priority: 'high' } };
      }

      if (url === '/tasks/task-1' && body?.dueDate) {
        return { data: { dueDate: '2026-04-10T15:00:00.000Z' } };
      }

      return { data: {} };
    });

    mockedApi.post.mockImplementation(async (url) => {
      if (url === '/ai/generate-subtasks') {
        return {
          data: {
            subtasks: [
              { title: 'Draft highlights' },
              { title: 'Collect blockers' },
            ],
          },
        };
      }

      if (url === '/tasks/task-1/subtasks') {
        return { data: {} };
      }

      return { data: {} };
    });

    render(
      <MemoryRouter>
        <SmartFocusMode />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Prepare sprint review')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /start now/i }));
    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith('/tasks/task-1', {
        status: 'in-progress',
        priority: 'high',
      });
    });
    expect(await screen.findByText('In progress now')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /tomorrow/i }));
    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith('/tasks/task-1', {
        dueDate: expect.any(String),
      });
    });
    expect(await screen.findByText('Rescheduled for tomorrow')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /create subtasks/i }));
    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/ai/generate-subtasks', {
        title: 'Prepare sprint review',
        description: 'Collect notes and metrics.',
      });
      expect(mockedApi.post).toHaveBeenCalledWith('/tasks/task-1/subtasks', { title: 'Draft highlights' });
      expect(mockedApi.post).toHaveBeenCalledWith('/tasks/task-1/subtasks', { title: 'Collect blockers' });
    });

    expect(await screen.findByText('AI subtasks created')).toBeInTheDocument();
    expect(screen.getByText('Draft highlights')).toBeInTheDocument();
    expect(screen.getByText('Collect blockers')).toBeInTheDocument();
  });
});
