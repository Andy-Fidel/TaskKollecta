const Invite = require('../../models/Invite');
const Membership = require('../../models/Membership');
const Organization = require('../../models/Organization');
const User = require('../../models/User');
const ProductEvent = require('../../models/ProductEvent');
const { createDomainError } = require('../shared/errors');
const { ensureMembership } = require('../shared/access');
const { emitDomainEvent } = require('../shared/domainEvents');

const INVITE_ROLES = ['admin', 'member', 'guest'];

const validateInviteRole = (role) => {
  if (!INVITE_ROLES.includes(role)) {
    throw createDomainError(400, 'Invalid invite role');
  }
};

const recordInviteEvent = async ({ userId, organizationId, eventName, metadata = {} }) => {
  await ProductEvent.create({
    user: userId,
    organization: organizationId,
    eventName,
    source: 'team_admin',
    metadata,
  });
};

const ensureInvitePermission = async (userId, organizationId, message = 'Not authorized to invite') => {
  const membership = await ensureMembership(userId, organizationId, message);
  if (!['owner', 'admin'].includes(membership.role)) {
    throw createDomainError(403, message);
  }

  return membership;
};

const ensureOrganizationExists = async (organizationId) => {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw createDomainError(404, 'Organization not found');
  }

  return organization;
};

const ensureInviteableEmail = async ({ email, organizationId }) => {
  const existingInvite = await Invite.findOne({
    email,
    organization: organizationId,
    status: 'pending',
  });

  if (existingInvite) {
    throw createDomainError(400, 'Invite already sent to this email');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const membership = await Membership.findOne({
      user: existingUser._id,
      organization: organizationId,
    });

    if (membership) {
      throw createDomainError(400, 'User is already a member');
    }
  }
};

const createInvite = async ({ body, user }) => {
  const { email, organizationId, role = 'member' } = body;
  validateInviteRole(role);
  const organization = await ensureOrganizationExists(organizationId);
  await ensureInvitePermission(user._id, organizationId);
  await ensureInviteableEmail({ email, organizationId });

  const invite = await Invite.create({
    email,
    organization: organizationId,
    invitedBy: user._id,
    role,
  });

  await emitDomainEvent('invite.created', {
    email,
    orgName: organization.name,
    inviterName: user.name,
    token: invite.token,
  });
  await recordInviteEvent({
    userId: user._id,
    organizationId,
    eventName: 'organization.invite_created',
    metadata: { email, role },
  });

  return {
    message: 'Invite sent successfully',
    invite: {
      _id: invite._id,
      email: invite.email,
      status: invite.status,
      expiresAt: invite.expiresAt,
    },
  };
};

const validateInvite = async ({ token }) => {
  const invite = await Invite.findOne({ token })
    .populate('organization', 'name')
    .populate('invitedBy', 'name');

  if (!invite) {
    throw createDomainError(404, 'Invite not found');
  }

  if (!invite.isValid()) {
    throw createDomainError(
      400,
      invite.status === 'accepted' ? 'Invite already used' : 'Invite has expired',
    );
  }

  return {
    valid: true,
    email: invite.email,
    organization: invite.organization,
    invitedBy: invite.invitedBy,
    role: invite.role,
  };
};

const acceptInvite = async ({ token, user }) => {
  if (!user) {
    throw createDomainError(401, 'Please login or signup first');
  }

  const invite = await Invite.findOne({ token }).populate('organization');
  if (!invite) {
    throw createDomainError(404, 'Invite not found');
  }

  if (!invite.isValid()) {
    throw createDomainError(400, 'Invite is no longer valid');
  }

  try {
    await Membership.create({
      user: user._id,
      organization: invite.organization._id,
      role: invite.role,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createDomainError(400, 'Already a member of this organization');
    }
    throw error;
  }

  await User.findByIdAndUpdate(user._id, {
    isInvitee: true,
    invitedToOrg: invite.organization._id,
  });

  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  invite.acceptedBy = user._id;
  await invite.save();

  return {
    message: 'Invite accepted',
    organization: invite.organization,
  };
};

const getOrgInvites = async ({ organizationId, userId }) => {
  await ensureInvitePermission(userId, organizationId, 'Not authorized to view invites');

  return Invite.find({
    organization: organizationId,
    status: 'pending',
  })
    .populate('invitedBy', 'name')
    .sort({ createdAt: -1 });
};

const cancelInvite = async ({ inviteId, userId }) => {
  const invite = await Invite.findById(inviteId);
  if (!invite) {
    throw createDomainError(404, 'Invite not found');
  }

  await ensureInvitePermission(userId, invite.organization, 'Not authorized to cancel this invite');

  invite.status = 'cancelled';
  await invite.save();
  await recordInviteEvent({
    userId,
    organizationId: invite.organization,
    eventName: 'organization.invite_cancelled',
    metadata: { inviteId, email: invite.email, role: invite.role },
  });

  return { message: 'Invite cancelled' };
};

const resendInvite = async ({ inviteId, userId }) => {
  const invite = await Invite.findById(inviteId).populate('organization', 'name');
  if (!invite) {
    throw createDomainError(404, 'Invite not found');
  }

  await ensureInvitePermission(userId, invite.organization._id, 'Not authorized to resend this invite');

  if (invite.status !== 'pending') {
    throw createDomainError(400, 'Only pending invites can be resent');
  }

  const inviter = await User.findById(userId).select('name');
  await emitDomainEvent('invite.created', {
    email: invite.email,
    orgName: invite.organization.name,
    inviterName: inviter?.name || 'A team admin',
    token: invite.token,
  });
  await recordInviteEvent({
    userId,
    organizationId: invite.organization._id,
    eventName: 'organization.invite_resent',
    metadata: { inviteId, email: invite.email, role: invite.role },
  });

  return { message: 'Invite resent' };
};

const createBulkInvites = async ({ body, user }) => {
  const { emails, organizationId, role = 'member' } = body;
  validateInviteRole(role);

  if (!Array.isArray(emails) || emails.length === 0) {
    throw createDomainError(400, 'Please provide at least one email');
  }

  if (emails.length > 20) {
    throw createDomainError(400, 'Maximum 20 invites at a time');
  }

  const organization = await ensureOrganizationExists(organizationId);
  await ensureInvitePermission(user._id, organizationId);

  const sent = [];
  const failed = [];

  const normalizedEmails = [...new Set(emails.map((rawEmail) => rawEmail.trim().toLowerCase()).filter(Boolean))];

  for (const email of normalizedEmails) {
    try {
      await ensureInviteableEmail({ email, organizationId });

      const invite = await Invite.create({
        email,
        organization: organizationId,
        invitedBy: user._id,
        role,
      });

      await emitDomainEvent('invite.created', {
        email,
        orgName: organization.name,
        inviterName: user.name,
        token: invite.token,
      });
      await recordInviteEvent({
        userId: user._id,
        organizationId,
        eventName: 'organization.invite_created',
        metadata: { email, role, bulk: true },
      });

      sent.push({ email });
    } catch (error) {
      failed.push({ email, reason: error.message || 'Failed to send' });
    }
  }

  return { sent, failed };
};

module.exports = {
  createInvite,
  createBulkInvites,
  validateInvite,
  acceptInvite,
  getOrgInvites,
  cancelInvite,
  resendInvite,
};
