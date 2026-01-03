const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const User = require('../models/User');

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private
const createOrganization = async (req, res) => {
  const { name, description } = req.body;

  try {
    // 1. Create the Organization
    const organization = await Organization.create({
      name,
      description,
      createdBy: req.user._id, // req.user comes from the 'protect' middleware
    });

    // 2. Add the current user as the ADMIN immediately
    await Membership.create({
      user: req.user._id,
      organization: organization._id,
      role: 'admin',
    });

    res.status(201).json(organization);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all organizations user belongs to
// @route   GET /api/organizations
// @access  Private
const getUserOrganizations = async (req, res) => {
  try {
    // Find all memberships for this user
    const memberships = await Membership.find({ user: req.user._id })
      .populate('organization', 'name description'); // "Join" the tables to get Org details

    // Clean up the data to just return the orgs
    const organizations = memberships.map(m => ({
      _id: m.organization._id,
      name: m.organization.name,
      role: m.role,
      joinedAt: m.joinedAt
    }));

    res.status(200).json(organizations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all members of an organization
// @route   GET /api/organizations/:id/members
const getOrgMembers = async (req, res) => {
  try {
    const memberships = await Membership.find({ organization: req.params.id })
      .populate('user', 'name email avatar'); // Get user details
    
    res.status(200).json(memberships);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to organization
// @route   POST /api/organizations/:id/members
const addMember = async (req, res) => {
  const { email } = req.body;
  try {
    // 1. Find User by Email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found. They must register first.' });
    }

    // 2. Check if already a member
    const exists = await Membership.findOne({ 
      user: user._id, 
      organization: req.params.id 
    });
    
    if (exists) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // 3. Create Membership (Default role: Member)
    const membership = await Membership.create({
      user: user._id,
      organization: req.params.id,
      role: 'member'
    });

    // Return the populated membership so UI updates instantly
    const populated = await Membership.findById(membership._id).populate('user', 'name email avatar');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrganization,
  getUserOrganizations,
    getOrgMembers,
    addMember
};