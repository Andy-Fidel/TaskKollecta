const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const User = require('../models/User');
const JoinRequest = require('../models/JoinRequest');

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private
const createOrganization = async (req, res) => {
  const { name } = req.body;

  try {
    //Create the Organization
    const organization = await Organization.create({
      name,
      createdBy: req.user._id,
    });


    await Membership.create({
      user: req.user._id,
      organization: organization._id,
      role: 'owner'
    });

    res.status(201).json(organization);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... (getUserOrganizations, getOrgMembers remain same) ...

// @desc    Update member role
// @route   PUT /api/organizations/:id/members/:userId
// @access  Private (Owner/Admin)
const updateMemberRole = async (req, res) => {
  const { role } = req.body;
  const { userId } = req.params;

  if (!['admin', 'member', 'guest'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const membership = await Membership.findOne({
      user: userId,
      organization: req.params.id
    });

    if (!membership) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Prevent changing owner role directly via this endpoint for safety (unless specifically allowed logic added)
    if (membership.role === 'owner') {
      return res.status(403).json({ message: 'Cannot change owner role manually.' });
    }

    membership.role = role;
    await membership.save();

    res.json(membership);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to organization
// @route   POST /api/organizations/:id/members
const addMember = async (req, res) => {
  const { email } = req.body;
  try {

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found. They must register first.' });
    }


    const exists = await Membership.findOne({
      user: user._id,
      organization: req.params.id
    });

    if (exists) {
      return res.status(400).json({ message: 'User is already a member' });
    }


    const membership = await Membership.create({
      user: user._id,
      organization: req.params.id,
      role: 'member'
    });


    const populated = await Membership.findById(membership._id).populate('user', 'name email avatar');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search for organizations (Public info only)
// @route   GET /api/organizations/search
const searchOrganizations = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);

  try {

    const orgs = await Organization.find({
      name: { $regex: query, $options: 'i' }
    }).select('name _id');

    res.json(orgs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request to join an organization
// @route   POST /api/organizations/:id/join
const requestToJoin = async (req, res) => {
  try {
    const orgId = req.params.id;
    const userId = req.user._id;


    const existingMember = await Membership.findOne({ user: userId, organization: orgId });
    if (existingMember) return res.status(400).json({ message: 'You are already a member.' });


    const existingRequest = await JoinRequest.findOne({ user: userId, organization: orgId, status: 'pending' });
    if (existingRequest) return res.status(400).json({ message: 'Request already pending.' });


    await JoinRequest.create({ user: userId, organization: orgId });

    res.status(200).json({ message: 'Request sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending join requests (Admin only)
// @route   GET /api/organizations/:id/requests
const getJoinRequests = async (req, res) => {
  try {
    const requests = await JoinRequest.find({ organization: req.params.id, status: 'pending' })
      .populate('user', 'name email avatar');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resolve a join request (Accept/Reject)
// @route   POST /api/organizations/:id/requests/:requestId/resolve
const resolveJoinRequest = async (req, res) => {
  const { action } = req.body;
  const { requestId } = req.params;

  try {
    const request = await JoinRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (action === 'accept') {

      await Membership.create({
        user: request.user,
        organization: request.organization,
        role: 'member'
      });

      await JoinRequest.findByIdAndDelete(requestId);
      res.json({ message: 'User added to organization' });
    } else {
      await JoinRequest.findByIdAndDelete(requestId);
      res.json({ message: 'Request rejected' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrganization,
  getUserOrganizations,
  getOrgMembers,
  addMember,
  searchOrganizations,
  requestToJoin,
  getJoinRequests,
  resolveJoinRequest
};