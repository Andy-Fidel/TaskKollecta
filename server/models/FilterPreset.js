const mongoose = require('mongoose');

const filterPresetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Preset name is required'],
        trim: true,
        maxlength: [50, 'Preset name cannot be more than 50 characters']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    filters: {
        statuses: [{
            type: String,
            enum: ['todo', 'in-progress', 'review', 'done']
        }],
        priorities: [{
            type: String,
            enum: ['low', 'medium', 'high', 'urgent']
        }],
        assignees: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        tags: [String],
        dateFrom: { type: Date },
        dateTo: { type: Date }
    }
}, { timestamps: true });

// Compound index for efficient querying
filterPresetSchema.index({ user: 1, project: 1 });

module.exports = mongoose.model('FilterPreset', filterPresetSchema);
