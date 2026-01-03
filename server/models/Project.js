const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'archived'], 
    default: 'active' 
  },
  // Link to the Parent Organization
  organization: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true 
  },
  // Who is leading this specific project?
  lead: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  // NEW: Visual distinction
  color: { type: String, default: '#0f172a' }, // Default slate-900
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // NEW: Project-specific Tags definitions
  tags: [{
    name: String,
    color: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);