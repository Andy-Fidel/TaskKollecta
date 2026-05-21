import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../../tests/setup';
import User from '../../models/User';
import Organization from '../../models/Organization';
import Membership from '../../models/Membership';
import Invite from '../../models/Invite';

vi.mock('../../utils/sendEmail', () => vi.fn().mockResolvedValue(undefined));

const inviteService = require('./inviteService');

describe('inviteService', () => {
  let owner: any;
  let org: any;

  beforeEach(async () => {
    owner = await User.create({
      name: 'Invite Owner',
      email: 'owner-invite@test.com',
      password: 'password123',
    });

    org = await Organization.create({
      name: 'Invite Org',
      createdBy: owner._id,
    });

    await Membership.create({
      user: owner._id,
      organization: org._id,
      role: 'owner',
    });
  });

  it('rejects duplicate pending invites for the same email', async () => {
    await Invite.create({
      email: 'member@test.com',
      organization: org._id,
      invitedBy: owner._id,
      role: 'member',
    });

    await expect(
      inviteService.createInvite({
        body: {
          email: 'member@test.com',
          organizationId: org._id.toString(),
        },
        user: owner,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Invite already sent to this email',
    });
  });

  it('rejects bulk invite requests larger than 20 emails', async () => {
    const emails = Array.from({ length: 21 }, (_, index) => `user${index}@test.com`);

    await expect(
      inviteService.createBulkInvites({
        body: {
          emails,
          organizationId: org._id.toString(),
        },
        user: owner,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Maximum 20 invites at a time',
    });
  });

  it('supports guest bulk invites and deduplicates repeated emails in one request', async () => {
    const result = await inviteService.createBulkInvites({
      body: {
        emails: ['guest@test.com', 'GUEST@test.com', 'second@test.com'],
        organizationId: org._id.toString(),
        role: 'guest',
      },
      user: owner,
    });

    expect(result.sent).toEqual([{ email: 'guest@test.com' }, { email: 'second@test.com' }]);
    expect(result.failed).toEqual([]);

    const invites = await Invite.find({ organization: org._id }).sort({ email: 1 });
    expect(invites.map((invite: any) => ({ email: invite.email, role: invite.role }))).toEqual([
      { email: 'guest@test.com', role: 'guest' },
      { email: 'second@test.com', role: 'guest' },
    ]);
  });

  it('resends pending invites and rejects cancelled invite resend attempts', async () => {
    const invite = await Invite.create({
      email: 'resend@test.com',
      organization: org._id,
      invitedBy: owner._id,
      role: 'member',
    });

    await expect(
      inviteService.resendInvite({
        inviteId: invite._id.toString(),
        userId: owner._id,
      }),
    ).resolves.toMatchObject({ message: 'Invite resent' });

    invite.status = 'cancelled';
    await invite.save();

    await expect(
      inviteService.resendInvite({
        inviteId: invite._id.toString(),
        userId: owner._id,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Only pending invites can be resent',
    });
  });
});
