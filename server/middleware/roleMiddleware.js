const Membership = require('../models/Membership');

// This function takes allowed roles (e.g., ['admin', 'manager'])
const checkOrgRole = (...allowedRoles) => {
  return async (req, res, next) => {
    // 1. Get Org ID from the URL (params) or the Body
    const orgId = req.params.orgId || req.body.orgId;

    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    try {
      // 2. Find the membership for this user in this org
      const membership = await Membership.findOne({
        user: req.user._id,
        organization: orgId
      });

      // 3. Deny if no membership exists
      if (!membership) {
        return res.status(403).json({ message: 'Not authorized to access this organization' });
      }

      // 4. Deny if role is not allowed (e.g., a 'member' trying to delete a project)
      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // 5. Attach membership to request for easier access later
      req.membership = membership;
      next();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};

module.exports = { checkOrgRole };