const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  dueDate: {
    type: Date
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  color: {
    type: String,
    default: '#0f172a'
  },
  tags: [{
    name: String,
    color: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);