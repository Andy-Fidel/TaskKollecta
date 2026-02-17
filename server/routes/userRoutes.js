const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { registerUser,
  loginUser,
  getMe,
  updateUserProfile,
  updateUserPassword,
  forgotPassword,
  resetPassword,
  updateNotificationPreferences,
  getNotificationPreferences,
  completeOnboarding
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('../middleware/validators');

// When someone POSTs to /, run the registerUser function
router.post('/', validateRegister, registerUser);
router.post('/login', validateLogin, loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateUserProfile);
router.put('/password', protect, updateUserPassword);

// Notification Preferences
router.get('/notifications', protect, getNotificationPreferences);
router.put('/notifications', protect, updateNotificationPreferences);

// Onboarding
router.post('/onboarding', protect, completeOnboarding);

router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Google OAuth Routes
const generateToken = require('../utils/generateToken');

// Start Google Login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Set HTTP-only cookie
    generateToken(res, req.user._id);
    // Also pass token via URL so client can store it in localStorage
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const needsOnboarding = !req.user.onboardingCompleted;
    res.redirect(`${process.env.CLIENT_URL}/login?token=${token}${needsOnboarding ? '&new=1' : ''}`);
  }
);

// Start Microsoft Login
router.get('/microsoft', passport.authenticate('microsoft', { prompt: 'select_account' }));

router.get(
  '/microsoft/callback',
  passport.authenticate('microsoft', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    generateToken(res, req.user._id);
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const needsOnboarding = !req.user.onboardingCompleted;
    res.redirect(`${process.env.CLIENT_URL}/login?token=${token}${needsOnboarding ? '&new=1' : ''}`);
  }
);

module.exports = router;