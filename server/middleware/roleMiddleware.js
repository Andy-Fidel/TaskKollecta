const Membership = require('../models/Membership');

const checkOrgRole = (requiredRole) => async (req, res, next) => {
  try {
    // Determine where the Org ID is
    const orgId = req.params.id || req.params.orgId || req.body.orgId;

    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID is required for permission check' });
    }

    // Find Membership
    const membership = await Membership.findOne({
      user: req.user._id,
      organization: orgId
    });

    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this organization' });
    }

    // 3. Check Role Hierarchy
    // 'admin' can do everything. 'member' has limited access.
    // If we require 'admin', user MUST be 'admin'.
    // If we require 'member', user can be 'admin' OR 'member'.
    
    if (requiredRole === 'admin' && membership.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }

    // If we just require 'member', both roles pass because admin is also a member effectively.
    
    req.membership = membership; 
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { checkOrgRole };