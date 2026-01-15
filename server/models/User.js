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
  googleId: { type: String }
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