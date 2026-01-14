const express = require('express');
const router = express.Router();
const { createForm, getForm, submitForm, getProjectForms } = require('../controllers/formController');
const { protect } = require('../middleware/authMiddleware');

// Protected Routes (Building forms)
router.post('/', protect, createForm);
router.get('/project/:projectId', protect, getProjectForms);

// Public Routes (Submitting forms - No protect middleware)
router.get('/:id', getForm);
router.post('/:id/submit', submitForm);

module.exports = router;