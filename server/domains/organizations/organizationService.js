const Organization = require('../../models/Organization');
const Membership = require('../../models/Membership');
const User = require('../../models/User');
const JoinRequest = require('../../models/JoinRequest');
const ProductEvent = require('../../models/ProductEvent');
const { createDomainError } = require('../shared/errors');
const { ensureMembership } = require('../shared/access');

const MANAGEABLE_ROLES = ['admin', 'member', 'guest'];

const recordTeamEvent = async ({ userId, organizationId, eventName, metadata = {} }) => {
  if (!userId) return;
  await ProductEvent.create({
    user: userId,
    organization: organizationId,
    eventName,
    source: 'team_admin',
    metadata,
  });
};

const createOrganization = async ({ name, userId }) => {
  const organization = await Organization.create({
    name,
    createdBy: userId,
  });

  await Membership.create({
    user: userId,
    organization: organization._id,
    role: 'owner',
  });

  return organization;
};

const getUserOrganizations = async ({ userId }) => {
  const memberships = await Membership.find({ user: userId })
    .populate('organization', 'name description logo website defaultProjectSettings');

  return memberships.map((membership) => ({
    _id: membership.organization._id,
    name: membership.organization.name,
    description: membership.organization.description,
    logo: membership.organization.logo,
    website: membership.organization.website,
    defaultProjectSettings: membership.organization.defaultProjectSettings,
    role: membership.role,
    joinedAt: membership.joinedAt,
  }));
};

const getOrganizationById = async ({ organizationId, userId }) => {
  await ensureMembership(userId, organizationId, 'Not a member of this organization');

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw createDomainError(404, 'Organization not found');
  }

  return organization;
};

const updateOrganization = async ({ organizationId, body, actorUserId }) => {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw createDomainError(404, 'Organization not found');
  }

  const { name, description, logo, website, defaultProjectSettings } = body;

  if (name !== undefined) organization.name = name.trim();
  if (description !== undefined) organization.description = description;
  if (logo !== undefined) organization.logo = logo;
  if (website !== undefined) organization.website = website;
  if (defaultProjectSettings) {
    organization.defaultProjectSettings = {
      ...organization.defaultProjectSettings.toObject(),
      ...defaultProjectSettings,
    };
  }

  const updated = await organization.save();
  await recordTeamEvent({
    userId: actorUserId,
    organizationId,
    eventName: 'organization.settings_updated',
    metadata: {
      fields: Object.keys(body || {}),
    },
  });
  return updated;
};

const getOrgMembers = async ({ organizationId, userId, query = {} }) => {
  await ensureMembership(userId, organizationId, 'Not authorized to view members of this organization');

  const filters = { organization: organizationId };

  if (query.role && ['owner', 'admin', 'member', 'guest'].includes(query.role)) {
    filters.role = query.role;
  }

  if (query.q) {
    const escaped = String(query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escaped) {
      const users = await User.find({
        $or: [
          { name: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
        ],
      }).select('_id');
      filters.user = { $in: users.map((user) => user._id) };
    }
  }

  const dbSortMap = {
    role: { role: 1, createdAt: 1 },
    joinedAt: { createdAt: 1 },
    'joinedAt-desc': { createdAt: -1 },
  };

  let members = await Membership.find(filters)
    .sort(dbSortMap[query.sort] || { createdAt: 1 })
    .populate('user', 'name email avatar');

  if (query.sort === 'name' || query.sort === 'name-desc' || query.sort === 'email' || query.sort === 'email-desc') {
    const direction = query.sort.endsWith('-desc') ? -1 : 1;
    const field = query.sort.startsWith('email') ? 'email' : 'name';
    members = members.sort((a, b) => {
      const left = a.user?.[field] || '';
      const right = b.user?.[field] || '';
      return left.localeCompare(right) * direction;
    });
  }

  return members;
};

const updateMemberRole = async ({ organizationId, userId, role, actorUserId }) => {
  if (!MANAGEABLE_ROLES.includes(role)) {
    throw createDomainError(400, 'Invalid role');
  }

  if (actorUserId && actorUserId.toString() === userId.toString()) {
    throw createDomainError(403, 'You cannot change your own role');
  }

  const actorMembership = await Membership.findOne({
    user: actorUserId,
    organization: organizationId,
  });

  if (!actorMembership || !['owner', 'admin'].includes(actorMembership.role)) {
    throw createDomainError(403, 'Not authorized to manage members');
  }

  const membership = await Membership.findOne({
    user: userId,
    organization: organizationId,
  });

  if (!membership) {
    throw createDomainError(404, 'Member not found');
  }

  if (membership.role === 'owner') {
    throw createDomainError(403, 'Cannot change owner role manually.');
  }

  if (actorMembership.role === 'admin') {
    if (membership.role === 'admin' || role === 'admin') {
      throw createDomainError(403, 'Only owners can manage admin roles');
    }
  }

  const previousRole = membership.role;
  membership.role = role;
  await membership.save();
  await recordTeamEvent({
    userId: actorUserId,
    organizationId,
    eventName: 'organization.member_role_updated',
    metadata: {
      targetUserId: userId,
      previousRole,
      role,
    },
  });
  return membership;
};

const addMember = async ({ organizationId, email, actorUserId }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw createDomainError(404, 'User not found. They must register first.');
  }

  const existingMembership = await Membership.findOne({
    user: user._id,
    organization: organizationId,
  });

  if (existingMembership) {
    throw createDomainError(400, 'User is already a member');
  }

  const membership = await Membership.create({
    user: user._id,
    organization: organizationId,
    role: 'member',
  });

  await recordTeamEvent({
    userId: actorUserId,
    organizationId,
    eventName: 'organization.member_added',
    metadata: {
      targetUserId: user._id,
      email,
      source: 'direct_add',
    },
  });

  return Membership.findById(membership._id).populate('user', 'name email avatar');
};

const removeMember = async ({ organizationId, userId, actorUserId }) => {
  if (actorUserId && actorUserId.toString() === userId.toString()) {
    throw createDomainError(403, 'You cannot remove yourself from the organization');
  }

  const actorMembership = await Membership.findOne({
    user: actorUserId,
    organization: organizationId,
  });

  if (!actorMembership || !['owner', 'admin'].includes(actorMembership.role)) {
    throw createDomainError(403, 'Not authorized to remove members');
  }

  const membership = await Membership.findOne({
    user: userId,
    organization: organizationId,
  }).populate('user', 'email');

  if (!membership) {
    throw createDomainError(404, 'Member not found');
  }

  if (membership.role === 'owner') {
    throw createDomainError(403, 'Cannot remove an organization owner');
  }

  if (actorMembership.role === 'admin' && membership.role === 'admin') {
    throw createDomainError(403, 'Only owners can remove admins');
  }

  await membership.deleteOne();
  await recordTeamEvent({
    userId: actorUserId,
    organizationId,
    eventName: 'organization.member_removed',
    metadata: {
      targetUserId: userId,
      email: membership.user?.email,
      previousRole: membership.role,
    },
  });

  return { message: 'Member removed from organization' };
};

const searchOrganizations = async ({ query }) => {
  if (!query) {
    return [];
  }

  return Organization.find({
    name: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
  }).select('name _id');
};

const requestToJoin = async ({ organizationId, userId }) => {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw createDomainError(404, 'Organization not found');
  }

  const existingMember = await Membership.findOne({ user: userId, organization: organizationId });
  if (existingMember) {
    throw createDomainError(400, 'You are already a member.');
  }

  const existingRequest = await JoinRequest.findOne({ user: userId, organization: organizationId })
    .sort({ createdAt: -1 });
  if (existingRequest?.status === 'pending') {
    throw createDomainError(400, 'Request already pending.');
  }

  if (organization.defaultProjectSettings?.requireApprovalToJoin === false) {
    await Membership.create({ user: userId, organization: organizationId, role: 'member' });
    await recordTeamEvent({
      userId,
      organizationId,
      eventName: 'organization.member_joined',
      metadata: { source: 'open_join' },
    });
    return { message: 'Joined organization successfully', status: 'joined' };
  }

  if (existingRequest) {
    existingRequest.status = 'pending';
    await existingRequest.save();
  } else {
    await JoinRequest.create({ user: userId, organization: organizationId, status: 'pending' });
  }
  return { message: 'Request sent successfully' };
};

const getJoinRequests = async ({ organizationId }) => {
  return JoinRequest.find({ organization: organizationId, status: 'pending' })
    .populate('user', 'name email avatar');
};

const resolveJoinRequest = async ({ organizationId, requestId, action, actorUserId }) => {
  if (!['accept', 'reject'].includes(action)) {
    throw createDomainError(400, 'Invalid request action');
  }

  const request = await JoinRequest.findOne({
    _id: requestId,
    organization: organizationId,
    status: 'pending',
  });
  if (!request) {
    throw createDomainError(404, 'Request not found');
  }

  if (action === 'accept') {
    const existingMembership = await Membership.findOne({
      user: request.user,
      organization: request.organization,
    });

    if (!existingMembership) {
      await Membership.create({
        user: request.user,
        organization: request.organization,
        role: 'member',
      });
    }

    request.status = 'approved';
    await request.save();
    await recordTeamEvent({
      userId: actorUserId,
      organizationId,
      eventName: 'organization.join_request_approved',
      metadata: { targetUserId: request.user },
    });
    return { message: 'User added to organization' };
  }

  request.status = 'rejected';
  await request.save();
  await recordTeamEvent({
    userId: actorUserId,
    organizationId,
    eventName: 'organization.join_request_rejected',
    metadata: { targetUserId: request.user },
  });
  return { message: 'Request rejected' };
};

module.exports = {
  createOrganization,
  getUserOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrgMembers,
  updateMemberRole,
  addMember,
  removeMember,
  searchOrganizations,
  requestToJoin,
  getJoinRequests,
  resolveJoinRequest,
  ensureOrganizationMembership: ensureMembership,
};
