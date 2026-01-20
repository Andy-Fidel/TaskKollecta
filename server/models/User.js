const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs'); // Ensure this is installed: npm install bcryptjs

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    // REMOVED required: true so Google Login works
  },
  avatar: { type: String, default: "" },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  googleId: { type: String },

  // Notification Preferences
  notificationPreferences: {
    emailAssignments: { type: Boolean, default: true },
    emailComments: { type: Boolean, default: true },
    emailDueDates: { type: Boolean, default: true },
    emailStatusChanges: { type: Boolean, default: false },
    emailMentions: { type: Boolean, default: true }
  },

  // Role and Account Status
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  suspendedAt: { type: Date },
  bannedAt: { type: Date },
  suspendReason: { type: String },
  banReason: { type: String },

  // Onboarding
  onboardingCompleted: { type: Boolean, default: false },
  onboardingData: {
    role: { type: String }, // personal, team_lead, manager
    teamSize: { type: String },
    goals: [{ type: String }]
  },

  // Invite tracking
  isInvitee: { type: Boolean, default: false },
  invitedToOrg: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }
}, { timestamps: true });

// --- PASSWORD ENCRYPTION MIDDLEWARE ---
userSchema.pre('save', async function () {
  // 1. If password is not modified, exit function
  if (!this.isModified('password')) {
    return;
  }

  // 2. If no password exists (e.g. Google Login), exit function
  if (!this.password) {
    return;
  }

  // 3. Hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// --- GENERATE RESET TOKEN METHOD ---
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);