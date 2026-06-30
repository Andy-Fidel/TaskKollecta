import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { ProjectHealthModal } from '../components/ProjectHealthModal';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedApi = api as Mocked<typeof api>;

describe('ProjectHealthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the redesigned health snapshot with project metrics', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        healthSnapshot: '🚀 Delivery is on track with healthy completion momentum.',
        stats: {
          totalTasks: 10,
          completedTasks: 7,
          inProgressTasks: 2,
          overdueTasks: 1,
          dueSoonTasks: 3,
          weeklyCompletionRate: 28,
        },
      },
    });

    render(<ProjectHealthModal projectId="project-1" isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: /project health/i })).toBeInTheDocument();
    expect(await screen.findByText('On track')).toBeInTheDocument();
    expect(screen.getByText('AI assessment')).toBeInTheDocument();
    expect(screen.getByText('🚀 Delivery is on track with healthy completion momentum.')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('7 of 10 tasks done')).toBeInTheDocument();
    expect(screen.getByText('28% weekly completion')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Due soon')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('refreshes the health snapshot on demand', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        healthSnapshot: '⚠️ Watch the upcoming deadline load.',
        stats: {
          totalTasks: 4,
          completedTasks: 1,
          inProgressTasks: 2,
          overdueTasks: 0,
          dueSoonTasks: 2,
          weeklyCompletionRate: 12,
        },
      },
    });

    render(<ProjectHealthModal projectId="project-1" isOpen onClose={vi.fn()} />);

    await screen.findByText('Needs attention');
    await userEvent.click(screen.getByRole('button', { name: /refresh snapshot/i }));

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledTimes(2);
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/ai/projects/project-1/health');
  });
});
