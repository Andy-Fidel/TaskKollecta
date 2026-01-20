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
  getNotificationPreferences
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// When someone POSTs to /, run the registerUser function
router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateUserProfile);
router.put('/password', protect, updateUserPassword);

// Notification Preferences
router.get('/notifications', protect, getNotificationPreferences);
router.put('/notifications', protect, updateNotificationPreferences);

router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Google OAuth Routes
// Helper to generate token (Reuse logic or import from controller)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Start Google Login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {

    const token = generateToken(req.user._id);

    res.redirect(`${process.env.CLIENT_URL}/login?token=${token}`);
  }
);

module.exports = router;