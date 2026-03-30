import { render, screen, waitFor } from './utils';
import { describe, it, expect, vi, type Mocked } from 'vitest';
import Dashboard from '../pages/Dashboard';
import api from '../api/axios';

// Mock our custom axios instance
vi.mock('../api/axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }
  };
});
const mockedApi = api as Mocked<typeof api>;

describe('Dashboard Page', () => {
  it('renders the dashboard with stat cards', async () => {
    // Mock the API responses
    mockedApi.get.mockImplementation(async (url) => {
      if (url?.includes('/dashboard')) {
        return {
          data: {
            stats: {
              activeTasks: 10,
              completedInPeriod: 5,
              completionRate: 50,
              overdue: 2
            },
            productivity: [],
            upcomingDeadlines: [],
            priorityBreakdown: [],
            recentActivity: [],
          }
        };
      }
      if (url?.includes('/organizations')) {
        return { data: [{ _id: 'org1', name: 'Test Org' }] };
      }
      return { data: [] };
    });

    render(<Dashboard />);

    // Wait for the stat label to appear after loading
    try {
      await screen.findByText('Total Projects', undefined, { timeout: 3000 });
      expect(screen.getByText('Total Projects')).toBeInTheDocument();
      expect(screen.getByText('Active Tasks')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    } catch (error) {
      throw error;
    }
  });
});
