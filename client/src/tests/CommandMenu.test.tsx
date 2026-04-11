import { render, screen, waitFor } from './utils';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, type Mocked } from 'vitest';
import { CommandMenu } from '../components/CommandMenu';
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

describe('CommandMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('creates a quick task from the command palette', async () => {
    localStorage.setItem('activeOrgId', 'org-1');

    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/projects') {
        return {
          data: [
            { _id: 'project-1', name: 'Core Product', organization: 'org-1' },
          ],
        };
      }
      if (url === '/organizations') {
        return {
          data: [
            { _id: 'org-1', name: 'Alpha Workspace' },
          ],
        };
      }
      return { data: { tasks: [], projects: [], users: [] } };
    });

    mockedApi.post.mockResolvedValue({ data: { _id: 'task-1' } });

    render(<CommandMenu />);

    await userEvent.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByText('Create Quick Task')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: /create quick task/i }));
    expect(await screen.findByRole('heading', { name: 'Create Quick Task' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Title'), 'Follow up on launch copy');
    await userEvent.type(screen.getByLabelText('Description'), 'Need a draft before Friday');
    await userEvent.click(screen.getByRole('button', { name: /create task/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/tasks', {
        title: 'Follow up on launch copy',
        description: 'Need a draft before Friday',
        priority: 'medium',
        projectId: 'project-1',
        orgId: 'org-1',
        status: 'todo',
      });
    });
  }, 10000);

  it('switches the active workspace from the command palette', async () => {
    localStorage.setItem('activeOrgId', 'org-1');

    mockedApi.get.mockImplementation(async (url) => {
      if (url === '/projects') return { data: [] };
      if (url === '/organizations') {
        return {
          data: [
            { _id: 'org-1', name: 'Alpha Workspace' },
            { _id: 'org-2', name: 'Beta Workspace' },
          ],
        };
      }
      return { data: { tasks: [], projects: [], users: [] } };
    });

    render(<CommandMenu />);

    await userEvent.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByRole('option', { name: /beta workspace/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: /beta workspace/i }));

    await waitFor(() => {
      expect(localStorage.getItem('activeOrgId')).toBe('org-2');
    });
  });
});
