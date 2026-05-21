const organizationService = require('./organizationService');
const { handleDomainError } = require('../shared/errors');

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private
const createOrganization = async (req, res) => {
  try {
    const organization = await organizationService.createOrganization({
      name: req.body.name,
      userId: req.user._id,
    });
    res.status(201).json(organization);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get all organizations user belongs to
// @route   GET /api/organizations
// @access  Private
const getUserOrganizations = async (req, res) => {
  try {
    const organizations = await organizationService.getUserOrganizations({ userId: req.user._id });
    res.status(200).json(organizations);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get single organization by ID
// @route   GET /api/organizations/:id
// @access  Private (Members)
const getOrganizationById = async (req, res) => {
  try {
    const org = await organizationService.getOrganizationById({
      organizationId: req.params.id,
      userId: req.user._id,
    });
    res.json(org);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Update organization settings
// @route   PUT /api/organizations/:id
// @access  Private (Owner/Admin only)
const updateOrganization = async (req, res) => {
  try {
    const updated = await organizationService.updateOrganization({
      organizationId: req.params.id,
      body: req.body,
      actorUserId: req.user._id,
    });
    res.json(updated);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get members of an organization
// @route   GET /api/organizations/:id/members
const getOrgMembers = async (req, res) => {
  try {
    const members = await organizationService.getOrgMembers({
      organizationId: req.params.id,
      userId: req.user._id,
      query: req.query,
    });
    res.json(members);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Update member role
// @route   PUT /api/organizations/:id/members/:userId
// @access  Private (Owner/Admin)
const updateMemberRole = async (req, res) => {
  try {
    const membership = await organizationService.updateMemberRole({
      organizationId: req.params.id,
      userId: req.params.userId,
      role: req.body.role,
      actorUserId: req.user._id,
    });
    res.json(membership);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Add member to organization
// @route   POST /api/organizations/:id/members
const addMember = async (req, res) => {
  try {
    const populated = await organizationService.addMember({
      organizationId: req.params.id,
      email: req.body.email,
      actorUserId: req.user._id,
    });
    res.status(201).json(populated);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Remove member from organization
// @route   DELETE /api/organizations/:id/members/:userId
// @access  Private (Owner/Admin)
const removeMember = async (req, res) => {
  try {
    const result = await organizationService.removeMember({
      organizationId: req.params.id,
      userId: req.params.userId,
      actorUserId: req.user._id,
    });
    res.json(result);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Search for organizations (Public info only)
// @route   GET /api/organizations/search
const searchOrganizations = async (req, res) => {
  try {
    const orgs = await organizationService.searchOrganizations({ query: req.query.query });
    res.json(orgs);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Request to join an organization
// @route   POST /api/organizations/:id/join
const requestToJoin = async (req, res) => {
  try {
    const result = await organizationService.requestToJoin({
      organizationId: req.params.id,
      userId: req.user._id,
    });
    res.status(200).json(result);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Get pending join requests (Admin only)
// @route   GET /api/organizations/:id/requests
const getJoinRequests = async (req, res) => {
  try {
    const requests = await organizationService.getJoinRequests({ organizationId: req.params.id });
    res.json(requests);
  } catch (error) {
    handleDomainError(res, error);
  }
};

// @desc    Resolve a join request (Accept/Reject)
// @route   POST /api/organizations/:id/requests/:requestId/resolve
const resolveJoinRequest = async (req, res) => {
  try {
    const result = await organizationService.resolveJoinRequest({
      organizationId: req.params.id,
      requestId: req.params.requestId,
      action: req.body.action,
      actorUserId: req.user._id,
    });
    res.json(result);
  } catch (error) {
    handleDomainError(res, error);
  }
};

module.exports = {
  createOrganization,
  getUserOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrgMembers,
  addMember,
  searchOrganizations,
  requestToJoin,
  getJoinRequests,
  resolveJoinRequest,
  updateMemberRole,
  removeMember
};
