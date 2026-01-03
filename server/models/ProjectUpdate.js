const mongoose = require('mongoose');

const projectUpdateSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['on-track', 'at-risk', 'off-track'], required: true },
  message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ProjectUpdate', projectUpdateSchema);