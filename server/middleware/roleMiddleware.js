const Membership = require('../models/Membership');

// Middleware to check if user has required role in the organization
// Usage: router.post('/:id/members', protect, checkRole('owner', 'admin'), addMember);
// Assumes req.params.id is the organization ID
const checkRole = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
      }

      const orgId = req.params.id || req.params.orgId || req.body.orgId || req.query.orgId || req.headers['x-active-org'];

      if (!orgId) {
        // If no org ID is found in standard places, we can't check org-specific roles
        // You might want to handle this differently depending on your API structure
        return res.status(400).json({ message: 'Organization ID required for permission check' });
      }

      const membership = await Membership.findOne({
        user: req.user._id,
        organization: orgId
      });

      if (!membership) {
        return res.status(403).json({ message: 'Not a member of this organization' });
      }

      if (!roles.includes(membership.role)) {
        return res.status(403).json({ message: `Access denied. Requires one of: ${roles.join(', ')}` });
      }

      // Attach membership to req for convenience in controllers
      req.membership = membership;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ message: 'Server error checking permissions' });
    }
  };
};

module.exports = { checkRole };