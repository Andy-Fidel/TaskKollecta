const Membership = require('../../models/Membership');
const { createDomainError } = require('./errors');

const ensureMembership = async (userId, organizationId, message = 'Access denied') => {
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
};
