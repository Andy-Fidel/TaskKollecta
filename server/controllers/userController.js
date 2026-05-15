const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const ROLE_BLUEPRINTS = {
  personal: {
    organizationSuffix: 'Personal Workspace',
    projectName: 'Personal Planner',
    projectDescription: 'A lightweight place to track your priorities, errands, and next actions.',
    projectColor: '#0f766e',
    defaultView: 'list',
    privacy: 'private',
    tasks: [
      { title: 'Capture this week\'s priorities', priority: 'high', description: 'List the 3-5 things you want to finish first.' },
      { title: 'Set up recurring personal check-ins', priority: 'medium', description: 'Add routines you revisit every week.' },
      { title: 'Review upcoming deadlines', priority: 'medium', description: 'Make sure important dates are visible and realistic.' },
    ],
    automations: [],
  },
  team_lead: {
    organizationSuffix: 'Team Workspace',
    projectName: 'Team Sprint Board',
    projectDescription: 'Plan active work, assign owners, and keep delivery moving with a clear weekly cadence.',
    projectColor: '#1d4ed8',
    defaultView: 'board',
    privacy: 'private',
    tasks: [
      { title: 'Define sprint goal', priority: 'high', description: 'Write the outcome the team should achieve this cycle.' },
      { title: 'Prioritize team backlog', priority: 'high', description: 'Pull the next set of tasks into active planning.' },
      { title: 'Assign owners for current work', priority: 'medium', description: 'Make sure every active task has a clear owner.' },
      { title: 'Review blockers and dependencies', priority: 'medium', description: 'Identify work that could stall the team this week.' },
    ],
    automations: [
      { triggerType: 'task_overdue', triggerValue: 'any', actionType: 'change_priority', actionValue: 'urgent' },
    ],
  },
  manager: {
    organizationSuffix: 'Operations Workspace',
    projectName: 'Portfolio Review',
    projectDescription: 'Track cross-team delivery, risk, and reporting in one operating workspace.',
    projectColor: '#7c3aed',
    defaultView: 'board',
    privacy: 'private',
    tasks: [
      { title: 'Set portfolio review cadence', priority: 'high', description: 'Decide when to review status, risks, and capacity.' },
      { title: 'Create leadership reporting checklist', priority: 'high', description: 'Capture the updates stakeholders expect every cycle.' },
      { title: 'Map active initiatives and owners', priority: 'medium', description: 'Make ownership and current status visible across teams.' },
      { title: 'Identify high-risk deliverables', priority: 'medium', description: 'Flag work that needs early escalation or support.' },
    ],
    automations: [
      { triggerType: 'task_overdue', triggerValue: 'any', actionType: 'send_notification', actionValue: 'project_lead' },
    ],
  },
};

function getRoleBlueprint(role, userName) {
  const blueprint = ROLE_BLUEPRINTS[role] || ROLE_BLUEPRINTS.personal;
  return {
    ...blueprint,
    organizationName: `${userName.split(' ')[0]}'s ${blueprint.organizationSuffix}`,
  };
}

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
      // Record login details
      user.lastLogin = Date.now();
      user.loginHistory.push({
        ip: req.ip || req.connection.remoteAddress,
        device: req.headers['user-agent'] || 'Unknown'
      });
      // Keep only last 20 logins to avoid document bloat
      if (user.loginHistory.length > 20) {
        user.loginHistory = user.loginHistory.slice(-20);
      }
      await user.save({ validateBeforeSave: false });

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        isInvitee: user.isInvitee,
        invitedToOrg: user.invitedToOrg,
        token: generateToken(res, user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear current session
// @route   POST /api/users/logout
// @access  Public
const logoutUser = async (_req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: process.env.NODE_ENV !== 'development' ? 'None' : 'Lax',
    expires: new Date(0),
  });

  res.status(200).json({ message: 'Logged out' });
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
        // Let the pre-save hook handle hashing
        user.password = req.body.password;
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
      // Let the pre-save hook handle hashing
      user.password = newPassword;
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

    // Let the pre-save hook handle hashing
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Set HTTP-only cookie with correct payload
    generateToken(res, user._id);

    res.status(200).json({
      success: true,
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

    const allowedPreferences = [
      'emailAssignments',
      'emailComments',
      'emailDueDates',
      'emailStatusChanges',
      'emailMentions',
      'inAppAssignments',
      'inAppComments',
      'inAppDueDates',
      'inAppStatusChanges',
      'inAppMentions',
      'inAppAutomations',
    ];

    for (const key of allowedPreferences) {
      if (req.body[key] !== undefined) {
        user.notificationPreferences[key] = req.body[key] === true;
      }
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

    const defaults = {
      emailAssignments: true,
      emailComments: true,
      emailDueDates: true,
      emailStatusChanges: false,
      emailMentions: true,
      inAppAssignments: true,
      inAppComments: true,
      inAppDueDates: true,
      inAppStatusChanges: true,
      inAppMentions: true,
      inAppAutomations: true,
    };

    res.json({
      ...defaults,
      ...(user.notificationPreferences?.toObject?.() || user.notificationPreferences || {}),
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

    const selectedRole = role || 'personal';
    const blueprint = getRoleBlueprint(selectedRole, user.name);

    let organization = null;
    let project = null;

    // Create organization if name provided (Creator path only)
    if (!user.isInvitee) {
      const Organization = require('../models/Organization');
      organization = await Organization.create({
        name: organizationName || blueprint.organizationName,
        createdBy: user._id
      });

      // Add user as OWNER (RBAC: creator gets full control)
      const Membership = require('../models/Membership');
      await Membership.create({
        user: user._id,
        organization: organization._id,
        role: 'owner'
      });

      // Create project if name provided
      {
        const Project = require('../models/Project');
        project = await Project.create({
          name: projectName || blueprint.projectName,
          description: blueprint.projectDescription,
          organization: organization._id,
          createdBy: user._id,
          lead: user._id,
          color: blueprint.projectColor,
          defaultView: blueprint.defaultView,
          privacy: blueprint.privacy,
        });

        if (blueprint.tasks.length > 0) {
          const Task = require('../models/Task');
          await Task.insertMany(
            blueprint.tasks.map((task, index) => ({
              title: task.title,
              description: task.description,
              priority: task.priority,
              status: index === 0 && selectedRole !== 'personal' ? 'in-progress' : 'todo',
              organization: organization._id,
              project: project._id,
              assignee: user._id,
              reporter: user._id,
            })),
          );
        }

        if (blueprint.automations.length > 0) {
          const Automation = require('../models/Automation');
          await Automation.insertMany(
            blueprint.automations.map((automation) => ({
              project: project._id,
              ...automation,
            })),
          );
        }
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

// @desc    Get reminder preferences
// @route   GET /api/users/reminders
const getReminderPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('reminderPreferences');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user.reminderPreferences || {
      defaultReminderTime: '1_day',
      remindDueDates: true,
      remindOverdue: true,
      remindAssignments: true,
      remindMeetings: false,
      remindStatusUpdates: false,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update reminder preferences
// @route   PUT /api/users/reminders
const updateReminderPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const allowed = [
      'defaultReminderTime', 'remindDueDates', 'remindOverdue',
      'remindAssignments', 'remindMeetings', 'remindStatusUpdates',
      'quietHoursEnabled', 'quietHoursStart', 'quietHoursEnd'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        user.reminderPreferences[key] = req.body[key];
      }
    }

    await user.save();
    res.json({ message: 'Reminder preferences updated', reminderPreferences: user.reminderPreferences });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateUserProfile,
  updateUserPassword,
  forgotPassword,
  resetPassword,
  updateNotificationPreferences,
  getNotificationPreferences,
  getReminderPreferences,
  updateReminderPreferences,
  completeOnboarding
};
