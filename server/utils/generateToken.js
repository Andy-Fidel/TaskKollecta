const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (res, userId, options = {}) => {
  const expiresIn = options.expiresIn || '24h';
  const sessionId = options.sessionId || crypto.randomUUID();
  const payload = { userId, sessionId, ...(options.payload || {}) };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  const maxAge = options.maxAge || 24 * 60 * 60 * 1000;

  res.cookie('jwt', token, {
    httpOnly: true,
    
    secure: process.env.NODE_ENV !== 'development', 
    sameSite: process.env.NODE_ENV !== 'development' ? 'None' : 'Lax', 
    maxAge, 
  });

  return token;
};

module.exports = generateToken;
