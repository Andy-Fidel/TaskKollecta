const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // 1. Link to Project (CRITICAL for fetching logs later)
  project: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Project', 
      required: true 
  },
  
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 2. Removed 'enum' strict check so 'moved', 'deleted', etc. won't fail
  action: { 
    type: String, 
    required: true
  },

  details: { type: String } 
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);