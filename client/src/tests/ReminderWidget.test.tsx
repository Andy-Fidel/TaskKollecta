import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, type Mocked } from 'vitest';
import { ReminderWidget } from '../components/ReminderWidget';
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

describe('ReminderWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads reminders, opens the inbox, and snoozes a reminder', async () => {
    mockedApi.get.mockResolvedValue({
      data: [
        {
          _id: 'rem-1',
          title: 'Send invoice follow-up',
          priority: 'high',
          tag: 'Finance',
          dueDate: '2026-04-09T09:00:00.000Z',
          completed: false,
        },
        {
          _id: 'rem-2',
          title: 'Review roadmap notes',
          priority: 'medium',
          tag: 'Planning',
          dueDate: '2026-04-10T10:00:00.000Z',
          completed: true,
        },
      ],
    });

    mockedApi.put.mockResolvedValue({
      data: {
        _id: 'rem-1',
        title: 'Send invoice follow-up',
        priority: 'high',
        tag: 'Finance',
        dueDate: '2026-04-10T09:00:00.000Z',
        completed: false,
      },
    });

    render(<ReminderWidget />);

    expect(await screen.findByText('Send invoice follow-up')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /view all/i }));
    expect(await screen.findByText('Reminder Inbox')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect(screen.getByText('Review roadmap notes')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /reminder options for send invoice follow-up/i }));
    await userEvent.click(await screen.findByText('Snooze 1 day'));

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith('/reminders/rem-1', {
        dueDate: expect.any(String),
      });
    });
  });
});
