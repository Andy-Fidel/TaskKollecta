const Organization = require('../../models/Organization');
const Membership = require('../../models/Membership');
const User = require('../../models/User');
const JoinRequest = require('../../models/JoinRequest');
const { createDomainError } = require('../shared/errors');
const { ensureMembership } = require('../shared/access');

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

const updateOrganization = async ({ organizationId, body }) => {
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

  return organization.save();
};

const getOrgMembers = async ({ organizationId, userId }) => {
  await ensureMembership(userId, organizationId, 'Not authorized to view members of this organization');

  return Membership.find({ organization: organizationId })
    .populate('user', 'name email avatar');
};

const updateMemberRole = async ({ organizationId, userId, role }) => {
  if (!['admin', 'member', 'guest'].includes(role)) {
    throw createDomainError(400, 'Invalid role');
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

  membership.role = role;
  await membership.save();
  return membership;
};

const addMember = async ({ organizationId, email }) => {
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

  return Membership.findById(membership._id).populate('user', 'name email avatar');
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
  const existingMember = await Membership.findOne({ user: userId, organization: organizationId });
  if (existingMember) {
    throw createDomainError(400, 'You are already a member.');
  }

  const existingRequest = await JoinRequest.findOne({ user: userId, organization: organizationId, status: 'pending' });
  if (existingRequest) {
    throw createDomainError(400, 'Request already pending.');
  }

  await JoinRequest.create({ user: userId, organization: organizationId });
  return { message: 'Request sent successfully' };
};

const getJoinRequests = async ({ organizationId }) => {
  return JoinRequest.find({ organization: organizationId, status: 'pending' })
    .populate('user', 'name email avatar');
};

const resolveJoinRequest = async ({ requestId, action }) => {
  const request = await JoinRequest.findById(requestId);
  if (!request) {
    throw createDomainError(404, 'Request not found');
  }

  if (action === 'accept') {
    await Membership.create({
      user: request.user,
      organization: request.organization,
      role: 'member',
    });

    await JoinRequest.findByIdAndDelete(requestId);
    return { message: 'User added to organization' };
  }

  await JoinRequest.findByIdAndDelete(requestId);
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
  searchOrganizations,
  requestToJoin,
  getJoinRequests,
  resolveJoinRequest,
  ensureOrganizationMembership: ensureMembership,
};
