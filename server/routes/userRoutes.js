const express = require('express');
const router = express.Router();
const { registerUser, 
    loginUser, 
    getMe, 
    updateUserProfile, 
    updateUserPassword,
    forgotPassword,
    resetPassword
 } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// When someone POSTs to /, run the registerUser function
router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateUserProfile);
router.put('/password', protect, updateUserPassword);

router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;