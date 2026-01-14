const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  
  
  fields: [{
    id: String, 
    type: { type: String, enum: ['text', 'textarea', 'date', 'select'], required: true },
    label: { type: String, required: true },
    placeholder: String,
    options: [String], 
    required: { type: Boolean, default: false }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Form', formSchema);