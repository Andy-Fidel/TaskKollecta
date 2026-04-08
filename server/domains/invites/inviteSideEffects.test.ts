import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const inviteSideEffects = require('./inviteSideEffects');

describe('inviteSideEffects', () => {
  const originalClientUrl = process.env.CLIENT_URL;

  beforeEach(() => {
    process.env.CLIENT_URL = 'https://app.taskkollecta.test';
  });

  it('builds invite URLs from the configured client origin', () => {
    expect(inviteSideEffects.buildInviteUrl('token-123')).toBe(
      'https://app.taskkollecta.test/login?invite=token-123',
    );
  });

  it('renders invite email content with inviter, org, and link details', () => {
    const html = inviteSideEffects.buildInviteEmailTemplate({
      inviterName: 'Alex',
      orgName: 'Platform Team',
      inviteUrl: 'https://app.taskkollecta.test/login?invite=token-123',
    });

    expect(html).toContain('Alex');
    expect(html).toContain('Platform Team');
    expect(html).toContain('https://app.taskkollecta.test/login?invite=token-123');
  });

  afterAll(() => {
    process.env.CLIENT_URL = originalClientUrl;
  });
});
