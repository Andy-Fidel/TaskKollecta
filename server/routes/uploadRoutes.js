const express = require('express');
const router = express.Router();
const { upload } = require('../config/storage');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/upload
// @desc    Upload a single file
router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  // Return the URL to the frontend
  res.json({ 
    url: req.file.path, 
    filename: req.file.originalname,
    type: req.file.mimetype 
  });
});

module.exports = router;