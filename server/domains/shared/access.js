const Membership = require('../../models/Membership');
const Organization = require('../../models/Organization');
const { createDomainError } = require('./errors');

const ensureOrganizationActive = async (organizationId) => {
  const organization = await Organization.findById(organizationId).select('status suspensionReason');
  if (!organization) {
    throw createDomainError(404, 'Organization not found');
  }

  if (organization.status && organization.status !== 'active') {
    throw createDomainError(423, organization.suspensionReason || 'Organization access is currently suspended');
  }

  return organization;
};

const ensureMembership = async (userId, organizationId, message = 'Access denied') => {
  await ensureOrganizationActive(organizationId);

  const membership = await Membership.findOne({
    user: userId,
    organization: organizationId,
  });

  if (!membership) {
    throw createDomainError(403, message);
  }

  return membership;
};

module.exports = {
  ensureMembership,
  ensureOrganizationActive,
};
