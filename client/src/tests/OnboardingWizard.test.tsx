import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, type Mocked } from 'vitest';
import OnboardingWizard from '../pages/OnboardingWizard';
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
  useAuth: () => ({
    user: {
      _id: 'user-1',
      name: 'Andy Doe',
      isInvitee: false,
    },
  }),
}));

const mockedApi = api as Mocked<typeof api>;

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('uses role-based defaults for manager onboarding', async () => {
    mockedApi.post.mockResolvedValue({ data: { ok: true } });

    render(<OnboardingWizard />);

    await userEvent.click(screen.getByRole('button', { name: /manager/i }));
    expect(screen.getByText(/portfolio-style workspace/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByPlaceholderText("Andy's Operations Workspace")).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByPlaceholderText('Portfolio Review')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    await userEvent.click(screen.getByRole('button', { name: /get started/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/users/onboarding', expect.objectContaining({
        role: 'manager',
        organizationName: "Andy's Operations Workspace",
        projectName: 'Portfolio Review',
      }));
    });
  });
});
