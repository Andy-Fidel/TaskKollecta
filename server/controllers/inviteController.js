const Invite = require('../models/Invite');
const Membership = require('../models/Membership');
const Organization = require('../models/Organization');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

/**
 * @desc    Create and send invite
 * @route   POST /api/invites
 */
const createInvite = async (req, res) => {
    try {
        const { email, organizationId, role = 'member' } = req.body;

        // Check organization exists and user has permission
        const org = await Organization.findById(organizationId);
        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Check if user is member/owner of org
        const membership = await Membership.findOne({
            user: req.user._id,
            organization: organizationId
        });
        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return res.status(403).json({ message: 'Not authorized to invite' });
        }

        // Check if already invited (pending)
        const existingInvite = await Invite.findOne({
            email,
            organization: organizationId,
            status: 'pending'
        });
        if (existingInvite) {
            return res.status(400).json({ message: 'Invite already sent to this email' });
        }

        // Check if user already member
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const isMember = await Membership.findOne({
                user: existingUser._id,
                organization: organizationId
            });
            if (isMember) {
                return res.status(400).json({ message: 'User is already a member' });
            }
        }

        // Create invite
        const invite = await Invite.create({
            email,
            organization: organizationId,
            invitedBy: req.user._id,
            role
        });

        // Send invite email
        const inviteUrl = `${process.env.CLIENT_URL}/login?invite=${invite.token}`;
        await sendEmail({
            email,
            subject: `You're invited to join ${org.name} on TaskKollecta`,
            message: `
        <h2>You've Been Invited!</h2>
        <p><strong>${req.user.name}</strong> has invited you to join <strong>${org.name}</strong> on TaskKollecta.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${inviteUrl}" style="display:inline-block;margin-top:15px;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">
          Accept Invitation
        </a>
        <p style="margin-top:20px;color:#666;font-size:14px;">This invite expires in 7 days.</p>
      `
        });

        res.status(201).json({
            message: 'Invite sent successfully',
            invite: {
                _id: invite._id,
                email: invite.email,
                status: invite.status,
                expiresAt: invite.expiresAt
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Validate invite token (public)
 * @route   GET /api/invites/:token
 */
const validateInvite = async (req, res) => {
    try {
        const invite = await Invite.findOne({ token: req.params.token })
            .populate('organization', 'name')
            .populate('invitedBy', 'name');

        if (!invite) {
            return res.status(404).json({ message: 'Invite not found' });
        }

        if (!invite.isValid()) {
            return res.status(400).json({
                message: invite.status === 'accepted' ? 'Invite already used' : 'Invite has expired'
            });
        }

        res.json({
            valid: true,
            email: invite.email,
            organization: invite.organization,
            invitedBy: invite.invitedBy,
            role: invite.role
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Accept invite and add user to org
 * @route   POST /api/invites/:token/accept
 */
const acceptInvite = async (req, res) => {
    try {
        const invite = await Invite.findOne({ token: req.params.token })
            .populate('organization');

        if (!invite) {
            return res.status(404).json({ message: 'Invite not found' });
        }

        if (!invite.isValid()) {
            return res.status(400).json({ message: 'Invite is no longer valid' });
        }

        // Check user is authenticated
        if (!req.user) {
            return res.status(401).json({ message: 'Please login or signup first' });
        }

        // Add user to organization
        await Membership.create({
            user: req.user._id,
            organization: invite.organization._id,
            role: invite.role
        });

        // Update user as invitee
        await User.findByIdAndUpdate(req.user._id, {
            isInvitee: true,
            invitedToOrg: invite.organization._id
        });

        // Mark invite as accepted
        invite.status = 'accepted';
        invite.acceptedAt = new Date();
        invite.acceptedBy = req.user._id;
        await invite.save();

        res.json({
            message: 'Invite accepted',
            organization: invite.organization
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Already a member of this organization' });
        }
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get pending invites for an organization
 * @route   GET /api/invites/org/:orgId
 */
const getOrgInvites = async (req, res) => {
    try {
        // Verify user has permission to view invites
        const membership = await Membership.findOne({
            user: req.user._id,
            organization: req.params.orgId
        });
        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return res.status(403).json({ message: 'Not authorized to view invites' });
        }

        const invites = await Invite.find({
            organization: req.params.orgId,
            status: 'pending'
        })
            .populate('invitedBy', 'name')
            .sort({ createdAt: -1 });

        res.json(invites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Cancel/revoke an invite
 * @route   DELETE /api/invites/:id
 */
const cancelInvite = async (req, res) => {
    try {
        const invite = await Invite.findById(req.params.id);
        if (!invite) {
            return res.status(404).json({ message: 'Invite not found' });
        }

        // Verify user has permission to cancel (must be admin/owner of the org)
        const membership = await Membership.findOne({
            user: req.user._id,
            organization: invite.organization
        });
        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return res.status(403).json({ message: 'Not authorized to cancel this invite' });
        }

        invite.status = 'cancelled';
        await invite.save();

        res.json({ message: 'Invite cancelled' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createInvite,
    validateInvite,
    acceptInvite,
    getOrgInvites,
    cancelInvite
};
