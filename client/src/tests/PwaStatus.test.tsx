import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaStatus } from '../components/PwaStatus';

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('PwaStatus', () => {
  beforeEach(() => {
    localStorage.clear();
    setOnline(true);
  });

  it('shows connection status when the device goes offline', async () => {
    render(<PwaStatus />);

    setOnline(false);
    fireEvent(window, new Event('offline'));

    expect(await screen.findByText('You are offline')).toBeInTheDocument();
  });

  it('offers installation and invokes the browser install prompt', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

    render(<PwaStatus />);
    fireEvent(window, installEvent);

    await userEvent.click(await screen.findByRole('button', { name: 'Install' }));

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
  });
});
