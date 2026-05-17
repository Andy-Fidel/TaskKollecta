import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, type Mocked } from 'vitest';
import ProjectBoard from '../pages/ProjectBoard';
import api from '../api/axios';
import { DataRefreshProvider } from '../context/DataRefreshContext';

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

vi.mock('../hooks/useSocket', () => ({
  useSocket: () => null,
}));

vi.mock('../components/KanbanColumn', () => ({
  KanbanColumn: ({ column, tasks = [], onQuickCreate, onToggleSelect, isCollapsed, onToggleCollapse, onSetWipLimit }) => (
    <div data-testid={`column-${column.id}`}>
      <span>{column.label}</span>
      <span>{tasks.length}</span>
      <span>{isCollapsed ? 'Collapsed' : 'Expanded'}</span>
      {column.wipLimit && <span>WIP {column.wipLimit}</span>}
      <button type="button" onClick={() => onToggleCollapse?.(column.id)}>
        Toggle {column.label}
      </button>
      <button type="button" onClick={() => onSetWipLimit?.(column.id, 3)}>
        Set WIP {column.label}
      </button>
      {tasks.map((task) => (
        <button key={task._id} type="button" onClick={() => onToggleSelect?.(task._id)}>
          Select {task.title}
        </button>
      ))}
      <button type="button" onClick={() => onQuickCreate?.(column.id, `Quick task in ${column.label}`)}>
        Quick add {column.label}
      </button>
    </div>
  ),
}));

vi.mock('../components/TaskDetailsModal', () => ({
  TaskDetailsModal: () => null,
}));

vi.mock('../components/AutomationModal', () => ({ AutomationModal: () => null }));
vi.mock('../components/ArchivedTasksModal', () => ({ ArchivedTasksModal: () => null }));
vi.mock('../components/ProjectAnalytics', () => ({ ProjectAnalytics: () => null }));
vi.mock('../components/ProjectUpdates', () => ({ ProjectUpdates: () => null }));
vi.mock('../components/ProjectList', () => ({ ProjectList: () => null }));
vi.mock('../components/ProjectCalendar', () => ({ ProjectCalendar: () => null }));
vi.mock('../components/ProjectHealthModal', () => ({ ProjectHealthModal: () => null }));
vi.mock('../components/RealtimeRisksSheet', () => ({ RealtimeRisksSheet: () => null }));
vi.mock('../components/ProjectSettingsDialog', () => ({ ProjectSettingsDialog: () => null }));
vi.mock('@/components/Filters/AdvancedFilters', () => ({
  AdvancedFilters: () => null,
  applyFilters: (tasks) => tasks,
}));

const mockedApi = api as Mocked<typeof api>;

function renderProjectBoard() {
  return render(
    <DataRefreshProvider>
      <MemoryRouter initialEntries={['/project/project-1']}>
        <Routes>
          <Route path="/project/:projectId" element={<ProjectBoard />} />
        </Routes>
      </MemoryRouter>
    </DataRefreshProvider>,
  );
}

describe('ProjectBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a task from the new task modal', async () => {
    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/projects/single/project-1') {
        return { data: { _id: 'project-1', name: 'Core Product', organization: 'org-1' } };
      }
      if (url === '/tasks/project/project-1?page=0&limit=50') {
        return { data: { tasks: [], pagination: { hasMore: false } } };
      }
      if (url === '/organizations/org-1/members') {
        return { data: [] };
      }
      if (url === '/filter-presets/project/project-1') {
        return { data: [] };
      }
      return { data: [] };
    });

    mockedApi.post.mockResolvedValue({
      data: {
        _id: 'task-1',
        title: 'Write release notes',
        description: 'Draft the weekly summary',
        status: 'todo',
        priority: 'medium',
        project: { _id: 'project-1', name: 'Core Product' },
      },
    });

    renderProjectBoard();

    expect(await screen.findByText('Core Product')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /new task/i }));
    expect(await screen.findByText('Add New Task')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Title'), 'Write release notes');
    await userEvent.type(screen.getByLabelText(/Description/i), 'Draft the weekly summary');
    await userEvent.click(screen.getByRole('button', { name: /^create task$/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/tasks', expect.objectContaining({
        title: 'Write release notes',
        description: 'Draft the weekly summary',
        projectId: 'project-1',
        orgId: 'org-1',
        status: 'todo',
      }));
    });
  }, 10000);

  it('creates a quick task directly in the selected board column', async () => {
    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/projects/single/project-1') {
        return { data: { _id: 'project-1', name: 'Core Product', organization: 'org-1' } };
      }
      if (url === '/tasks/project/project-1?page=0&limit=50') {
        return { data: { tasks: [], pagination: { hasMore: false } } };
      }
      if (url === '/organizations/org-1/members') {
        return { data: [] };
      }
      if (url === '/filter-presets/project/project-1') {
        return { data: [] };
      }
      return { data: [] };
    });

    mockedApi.post.mockResolvedValue({
      data: {
        _id: 'task-quick-1',
        title: 'Quick task in Review',
        status: 'review',
        priority: 'medium',
        project: { _id: 'project-1', name: 'Core Product' },
      },
    });

    renderProjectBoard();

    expect(await screen.findByText('Core Product')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /quick add review/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/tasks', expect.objectContaining({
        title: 'Quick task in Review',
        projectId: 'project-1',
        orgId: 'org-1',
        status: 'review',
        priority: 'medium',
        index: 1000,
      }));
    });
  }, 10000);

  it('confirms before bulk deleting selected tasks', async () => {
    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/projects/single/project-1') {
        return { data: { _id: 'project-1', name: 'Core Product', organization: 'org-1' } };
      }
      if (url === '/tasks/project/project-1?page=0&limit=50') {
        return {
          data: {
            tasks: [{
              _id: 'task-1',
              title: 'Remove stale task',
              status: 'todo',
              priority: 'medium',
              project: { _id: 'project-1', name: 'Core Product' },
            }],
            pagination: { hasMore: false },
          },
        };
      }
      if (url === '/organizations/org-1/members') {
        return { data: [] };
      }
      if (url === '/filter-presets/project/project-1') {
        return { data: [] };
      }
      return { data: [] };
    });
    mockedApi.delete.mockResolvedValue({ data: { message: '1 tasks deleted' } });

    renderProjectBoard();

    expect(await screen.findByText('Core Product')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /select remove stale task/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(await screen.findByText('Delete selected tasks?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /delete tasks/i }));

    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith('/tasks/bulk', {
        data: { taskIds: ['task-1'] },
      });
    });
  }, 10000);

  it('tracks collapsed board columns', async () => {
    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/projects/single/project-1') {
        return { data: { _id: 'project-1', name: 'Core Product', organization: 'org-1' } };
      }
      if (url === '/tasks/project/project-1?page=0&limit=50') {
        return { data: { tasks: [], pagination: { hasMore: false } } };
      }
      if (url === '/organizations/org-1/members') {
        return { data: [] };
      }
      if (url === '/filter-presets/project/project-1') {
        return { data: [] };
      }
      return { data: [] };
    });

    renderProjectBoard();

    expect(await screen.findByText('Core Product')).toBeInTheDocument();
    expect(screen.getByTestId('column-review')).toHaveTextContent('Expanded');

    await userEvent.click(screen.getByRole('button', { name: /toggle review/i }));
    expect(screen.getByTestId('column-review')).toHaveTextContent('Collapsed');

    await userEvent.click(screen.getByRole('button', { name: /toggle review/i }));
    expect(screen.getByTestId('column-review')).toHaveTextContent('Expanded');
  }, 10000);

  it('saves WIP limits on workflow columns', async () => {
    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/projects/single/project-1') {
        return {
          data: {
            _id: 'project-1',
            name: 'Core Product',
            organization: 'org-1',
            workflowStatuses: [
              { id: 'todo', label: 'To Do', color: '#64748b', order: 0, isDone: false },
              { id: 'review', label: 'Review', color: '#f59e0b', order: 1, isDone: false },
            ],
          },
        };
      }
      if (url === '/tasks/project/project-1?page=0&limit=50') {
        return { data: { tasks: [], pagination: { hasMore: false } } };
      }
      if (url === '/organizations/org-1/members') {
        return { data: [] };
      }
      if (url === '/filter-presets/project/project-1') {
        return { data: [] };
      }
      return { data: [] };
    });
    mockedApi.put.mockResolvedValue({
      data: {
        _id: 'project-1',
        name: 'Core Product',
        organization: 'org-1',
        workflowStatuses: [
          { id: 'todo', label: 'To Do', color: '#64748b', order: 0, isDone: false },
          { id: 'review', label: 'Review', color: '#f59e0b', order: 1, isDone: false, wipLimit: 3 },
        ],
      },
    });

    renderProjectBoard();

    expect(await screen.findByText('Core Product')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /set wip review/i }));

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith('/projects/project-1', {
        workflowStatuses: [
          { id: 'todo', label: 'To Do', color: '#64748b', isDone: false, order: 0, wipLimit: null },
          { id: 'review', label: 'Review', color: '#f59e0b', isDone: false, order: 1, wipLimit: 3 },
        ],
      });
    });
  }, 10000);
});
