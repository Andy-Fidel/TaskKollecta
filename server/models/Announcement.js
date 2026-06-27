const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    message: {
        type: String,
        required: [true, 'Announcement message is required'],
        trim: true,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'success', 'danger'],
        default: 'info'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startsAt: {
        type: Date
    },
    expiresAt: {
        type: Date
    },
    targetRoles: [{
        type: String,
        enum: ['user', 'admin', 'superadmin']
    }],
    targetOrganizations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    }],
    dismissedAt: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
