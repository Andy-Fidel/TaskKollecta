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
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    scope: {
        type: String,
        enum: ['project', 'my_tasks'],
        default: 'project'
    },
    visibility: {
        type: String,
        enum: ['private', 'team'],
        default: 'private'
    },
    layout: {
        type: String,
        enum: ['board', 'list', 'calendar', 'timeline', 'my_tasks'],
        default: 'board'
    },
    sort: {
        field: { type: String, default: 'updatedAt' },
        direction: { type: String, enum: ['asc', 'desc'], default: 'desc' }
    },
    filters: {
        statuses: [{
            type: String
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
        customFields: { type: Map, of: mongoose.Schema.Types.Mixed },
        dateFrom: { type: Date },
        dateTo: { type: Date },
        query: { type: String, default: '' },
        blockedOnly: { type: Boolean, default: false },
        view: { type: String },
        projectFilter: { type: String, default: 'all' },
        priority: { type: String, default: 'all' }
    }
}, { timestamps: true });

// Compound index for efficient querying
filterPresetSchema.index({ user: 1, project: 1, scope: 1 });
filterPresetSchema.index({ organization: 1, scope: 1, visibility: 1 });

module.exports = mongoose.models.FilterPreset || mongoose.model('FilterPreset', filterPresetSchema);
