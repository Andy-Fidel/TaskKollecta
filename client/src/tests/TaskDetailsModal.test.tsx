import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, type Mocked } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
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
      <MemoryRouter>
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
        />
      </MemoryRouter>,
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

  it('prevents completing a task with unfinished dependencies', async () => {
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

    render(
      <MemoryRouter>
        <TaskDetailsModal
          task={{
            _id: 'task-1',
            title: 'Publish release',
            description: '',
            project: { _id: 'project-1', name: 'Core Product' },
            organization: 'org-1',
            reporter: 'user-1',
            status: 'todo',
            priority: 'high',
            subtasks: [],
            dependencies: [{ _id: 'dependency-1', title: 'Finish QA', status: 'todo' }],
            tags: [],
            attachments: [],
          }}
          isOpen={true}
          onClose={vi.fn()}
          projectId="project-1"
          orgId="org-1"
          socket={null}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Publish release')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark complete/i })).toBeDisabled();
    expect(screen.getByText(/Finish blocking tasks before completion/i)).toBeInTheDocument();
  });

  it('confirms before deleting a task', async () => {
    const onClose = vi.fn();
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
    mockedApi.delete.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <TaskDetailsModal
          task={{
            _id: 'task-1',
            title: 'Remove stale task',
            description: '',
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
          onClose={onClose}
          projectId="project-1"
          orgId="org-1"
          socket={null}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Remove stale task')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /task actions/i }));
    await userEvent.click(await screen.findByText(/delete task/i));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^delete task$/i }));

    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith('/tasks/task-1');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('previews AI descriptions before inserting them', async () => {
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
    mockedApi.post.mockImplementation(async (url) => {
      if (url === '/ai/describe') {
        return {
          data: {
            description: 'Generated task context',
            acceptanceCriteria: ['Confirm launch checklist'],
          },
        };
      }
      return { data: {} };
    });

    render(
      <MemoryRouter>
        <TaskDetailsModal
          task={{
            _id: 'task-1',
            title: 'Prepare launch',
            description: 'Original description',
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
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Prepare launch')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ai describe/i }));
    expect(await screen.findByText(/AI description draft/i)).toBeInTheDocument();
    expect(screen.getByText(/Generated task context/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original description')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /insert draft/i }));
    expect(screen.getByDisplayValue(/Generated task context/i)).toBeInTheDocument();
  });

  it('converts a checklist item into a child task', async () => {
    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/comments/task-1') return { data: { comments: [] } };
      if (url === '/activities/task/task-1') return { data: [] };
      if (url === '/organizations/org-1/members') {
        return { data: [{ role: 'owner', user: { _id: 'user-1', name: 'Andy' } }] };
      }
      if (url === '/tasks/task-1/children') return { data: [] };
      return { data: [] };
    });
    mockedApi.post.mockImplementation(async (url) => {
      if (url === '/tasks/task-1/children') {
        return {
          data: {
            _id: 'child-1',
            title: 'Draft checklist item',
            status: 'todo',
          },
        };
      }
      return { data: {} };
    });
    mockedApi.delete.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <TaskDetailsModal
          task={{
            _id: 'task-1',
            title: 'Parent task',
            description: '',
            project: { _id: 'project-1', name: 'Core Product' },
            organization: 'org-1',
            reporter: 'user-1',
            status: 'todo',
            priority: 'medium',
            subtasks: [{ _id: 'subtask-1', title: 'Draft checklist item', isCompleted: false }],
            dependencies: [],
            tags: [],
            attachments: [],
          }}
          isOpen={true}
          onClose={vi.fn()}
          projectId="project-1"
          orgId="org-1"
          socket={null}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Parent task')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /make task/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/tasks/task-1/children', { title: 'Draft checklist item' });
      expect(mockedApi.delete).toHaveBeenCalledWith('/tasks/task-1/subtasks/subtask-1');
    });
    expect(screen.getByText('Child tasks')).toBeInTheDocument();
  });

  it('uploads attachments through the shared upload flow', async () => {
    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/comments/task-1') return { data: { comments: [] } };
      if (url === '/activities/task/task-1') return { data: [] };
      if (url === '/organizations/org-1/members') {
        return { data: [{ role: 'owner', user: { _id: 'user-1', name: 'Andy' } }] };
      }
      if (url === '/tasks/task-1/children') return { data: [] };
      return { data: [] };
    });
    mockedApi.post.mockImplementation(async (url) => {
      if (url === '/upload') {
        return { data: { url: 'https://cdn.test/brief.pdf', filename: 'brief.pdf', type: 'application/pdf' } };
      }
      if (url === '/tasks/task-1/attachments') {
        return {
          data: {
            attachments: [
              {
                _id: 'attachment-1',
                url: 'https://cdn.test/brief.pdf',
                filename: 'brief.pdf',
                type: 'application/pdf',
                uploadedAt: new Date().toISOString(),
              },
            ],
          },
        };
      }
      return { data: {} };
    });

    render(
      <MemoryRouter>
        <TaskDetailsModal
          task={{
            _id: 'task-1',
            title: 'Attach brief',
            description: '',
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
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Attach brief')).toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['brief'], 'brief.pdf', { type: 'application/pdf' });

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/upload', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(mockedApi.post).toHaveBeenCalledWith('/tasks/task-1/attachments', {
        url: 'https://cdn.test/brief.pdf',
        filename: 'brief.pdf',
        type: 'application/pdf',
      });
    });
    expect(screen.getByText('Attached')).toBeInTheDocument();
    expect(screen.getAllByText('brief.pdf').length).toBeGreaterThan(0);
  });
});
