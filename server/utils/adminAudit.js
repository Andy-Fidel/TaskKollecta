const crypto = require('crypto');
const AdminAuditLog = require('../models/AdminAuditLog');

const pickUserAuditFields = (user) => {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    suspendedAt: user.suspendedAt,
    bannedAt: user.bannedAt,
    suspendReason: user.suspendReason,
    banReason: user.banReason,
  };
};

const getRequestIp = (req) => (
  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  || req.ip
  || req.connection?.remoteAddress
  || ''
);

const createAdminAuditLog = async ({
  req,
  action,
  target,
  targetModel = 'User',
  reason,
  before,
  after,
}) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

  const log = await AdminAuditLog.create({
    actor: req.user._id,
    target: target?._id || target || undefined,
    targetModel,
    action,
    reason,
    before,
    after,
    ip: getRequestIp(req),
    userAgent: req.headers['user-agent'] || '',
    correlationId,
  });

  return log;
};

module.exports = {
  createAdminAuditLog,
  pickUserAuditFields,
};
