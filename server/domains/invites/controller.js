const inviteService = require('./inviteService');
const { handleDomainError } = require('../shared/errors');

/**
 * @desc    Create and send invite
 * @route   POST /api/invites
 */
const createInvite = async (req, res) => {
    try {
        const result = await inviteService.createInvite({
            body: req.body,
            user: req.user,
        });
        res.status(201).json(result);
    } catch (error) {
        handleDomainError(res, error);
    }
};

/**
 * @desc    Validate invite token (public)
 * @route   GET /api/invites/:token
 */
const validateInvite = async (req, res) => {
    try {
        const result = await inviteService.validateInvite({ token: req.params.token });
        res.json(result);
    } catch (error) {
        handleDomainError(res, error);
    }
};

/**
 * @desc    Accept invite and add user to org
 * @route   POST /api/invites/:token/accept
 */
const acceptInvite = async (req, res) => {
    try {
        const result = await inviteService.acceptInvite({
            token: req.params.token,
            user: req.user,
        });
        res.json(result);
    } catch (error) {
        handleDomainError(res, error);
    }
};

/**
 * @desc    Get pending invites for an organization
 * @route   GET /api/invites/org/:orgId
 */
const getOrgInvites = async (req, res) => {
    try {
        const invites = await inviteService.getOrgInvites({
            organizationId: req.params.orgId,
            userId: req.user._id,
        });
        res.json(invites);
    } catch (error) {
        handleDomainError(res, error);
    }
};

/**
 * @desc    Cancel/revoke an invite
 * @route   DELETE /api/invites/:id
 */
const cancelInvite = async (req, res) => {
    try {
        const result = await inviteService.cancelInvite({
            inviteId: req.params.id,
            userId: req.user._id,
        });
        res.json(result);
    } catch (error) {
        handleDomainError(res, error);
    }
};

/**
 * @desc    Resend a pending invite
 * @route   POST /api/invites/:id/resend
 */
const resendInvite = async (req, res) => {
    try {
        const result = await inviteService.resendInvite({
            inviteId: req.params.id,
            userId: req.user._id,
        });
        res.json(result);
    } catch (error) {
        handleDomainError(res, error);
    }
};

/**
 * @desc    Bulk invite multiple emails at once
 * @route   POST /api/invites/bulk
 */
const createBulkInvites = async (req, res) => {
    try {
        const result = await inviteService.createBulkInvites({
            body: req.body,
            user: req.user,
        });
        res.status(201).json(result);
    } catch (error) {
        handleDomainError(res, error);
    }
};

module.exports = {
    createInvite,
    createBulkInvites,
    validateInvite,
    acceptInvite,
    getOrgInvites,
    cancelInvite,
    resendInvite
};
