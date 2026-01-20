const mongoose = require('mongoose');
const crypto = require('crypto');

const inviteSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        unique: true
    },
    role: {
        type: String,
        enum: ['member', 'admin'],
        default: 'member'
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'expired', 'cancelled'],
        default: 'pending'
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    acceptedAt: {
        type: Date
    },
    acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Generate unique token before saving
inviteSchema.pre('save', function (next) {
    if (!this.token) {
        this.token = crypto.randomBytes(32).toString('hex');
    }
    next();
});

// Check if invite is valid
inviteSchema.methods.isValid = function () {
    return this.status === 'pending' && this.expiresAt > new Date();
};

// Index for fast token lookup
inviteSchema.index({ token: 1 });
inviteSchema.index({ email: 1, organization: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Invite', inviteSchema);
