const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// @desc    Register new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, inviteToken } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check for valid invite
    let invite = null;
    let isInvitee = false;
    let invitedToOrg = null;

    if (inviteToken) {
      const Invite = require('../models/Invite');
      invite = await Invite.findOne({ token: inviteToken, status: 'pending' });

      if (invite && invite.isValid()) {
        isInvitee = true;
        invitedToOrg = invite.organization;
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      isInvitee,
      invitedToOrg
    });

    // If invite exists, add user to organization
    if (invite) {
      const Membership = require('../models/Membership');
      await Membership.create({
        user: user._id,
        organization: invite.organization,
        role: invite.role || 'member'
      });

      // Mark invite as accepted
      invite.status = 'accepted';
      invite.acceptedAt = new Date();
      invite.acceptedBy = user._id;
      await invite.save();
    }

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        isInvitee: user.isInvitee,
        invitedToOrg: user.invitedToOrg,
        onboardingCompleted: user.onboardingCompleted,
        token: generateToken(res, user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  };
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {

    const user = await User.findOne({ email });


    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        token: generateToken(res, user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  res.status(200).json(req.user);
};

// @desc    Update user profile
// @route   PUT /api/users/profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;

      if (req.body.avatar) {
        user.avatar = req.body.avatar;
      }

      if (req.body.password) {

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,

      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/users/password
const updateUserPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);


    if (user && (await bcrypt.compare(currentPassword, user.password))) {

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();
      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(401).json({ message: 'Invalid current password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }


    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create Reset URL pointing to Frontend
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const message = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Please go to this link to reset your password:</p>
      <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
      <p>This link expires in 10 minutes.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message,
      });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resettoken
const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }


    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);


    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();


    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/users/notifications
const updateNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { emailAssignments, emailComments, emailDueDates, emailStatusChanges, emailMentions } = req.body;

    // Update only provided preferences
    if (emailAssignments !== undefined) {
      user.notificationPreferences.emailAssignments = emailAssignments;
    }
    if (emailComments !== undefined) {
      user.notificationPreferences.emailComments = emailComments;
    }
    if (emailDueDates !== undefined) {
      user.notificationPreferences.emailDueDates = emailDueDates;
    }
    if (emailStatusChanges !== undefined) {
      user.notificationPreferences.emailStatusChanges = emailStatusChanges;
    }
    if (emailMentions !== undefined) {
      user.notificationPreferences.emailMentions = emailMentions;
    }

    await user.save();

    res.json({
      message: 'Notification preferences updated',
      notificationPreferences: user.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get notification preferences
// @route   GET /api/users/notifications
const getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.notificationPreferences || {
      emailAssignments: true,
      emailComments: true,
      emailDueDates: true,
      emailStatusChanges: false,
      emailMentions: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Complete onboarding wizard
// @route   POST /api/users/onboarding
const completeOnboarding = async (req, res) => {
  try {
    const { role, teamSize, goals, organizationName, projectName, inviteEmails } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Save onboarding data - only set provided fields
    user.onboardingData = {
      role: role || 'personal',
      teamSize: teamSize || '',
      goals: goals || []
    };
    user.onboardingCompleted = true;
    await user.save();

    let organization = null;
    let project = null;

    // Create organization if name provided (Creator path only)
    if (organizationName && !user.isInvitee) {
      const Organization = require('../models/Organization');
      organization = await Organization.create({
        name: organizationName,
        createdBy: user._id
      });

      // Add user as owner
      const Membership = require('../models/Membership');
      await Membership.create({
        user: user._id,
        organization: organization._id,
        role: 'owner'
      });

      // Create project if name provided
      if (projectName) {
        const Project = require('../models/Project');
        project = await Project.create({
          name: projectName,
          organization: organization._id,
          createdBy: user._id
        });
      }
    }

    // Handle invites (just log for now, or send invite emails)
    if (inviteEmails && inviteEmails.length > 0) {
      console.log('Invite emails:', inviteEmails);
    }

    res.json({
      message: 'Onboarding completed',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        role: user.role
      },
      organization,
      project
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateUserProfile,
  updateUserPassword,
  forgotPassword,
  resetPassword,
  updateNotificationPreferences,
  getNotificationPreferences,
  completeOnboarding
};