import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, type Mocked } from 'vitest';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'user-1', name: 'Andy' } }),
}));

const mockedApi = api as Mocked<typeof api>;

describe('TaskDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('edits and saves the task description', async () => {
    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/comments/task-1') {
        return { data: { comments: [] } };
      }
      if (url === '/activities/task/task-1') {
        return { data: [] };
      }
      if (url === '/organizations/org-1/members') {
        return {
          data: [
            { role: 'owner', user: { _id: 'user-1', name: 'Andy' } },
          ],
        };
      }
      if (url === '/tasks/task-1/children') {
        return { data: [] };
      }
      return { data: [] };
    });

    mockedApi.put.mockResolvedValue({ data: {} });

    render(
      <TaskDetailsModal
        task={{
          _id: 'task-1',
          title: 'Write release notes',
          description: 'Initial summary',
          project: { _id: 'project-1', name: 'Core Product' },
          organization: 'org-1',
          reporter: 'user-1',
          status: 'todo',
          priority: 'medium',
          subtasks: [],
          dependencies: [],
          tags: [],
          attachments: [],
        }}
        isOpen={true}
        onClose={vi.fn()}
        projectId="project-1"
        orgId="org-1"
        socket={null}
      />,
    );

    expect(await screen.findByText('Write release notes')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Initial summary'));
    const input = await screen.findByDisplayValue('Initial summary');
    await userEvent.clear(input);
    await userEvent.type(input, 'Updated summary for the sprint review');
    await userEvent.click(screen.getByRole('button', { name: /save description/i }));

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith('/tasks/task-1', {
        description: 'Updated summary for the sprint review',
      });
    });
  }, 10000);
});
