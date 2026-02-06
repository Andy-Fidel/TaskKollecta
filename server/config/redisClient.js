const Redis = require('ioredis');

// Default to localhost for development, use REDIS_URL in production
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true, // Don't connect immediately, allow graceful degradation
});

// Track connection state
let isConnected = false;

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
  isConnected = true;
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
  isConnected = false;
});

redisClient.on('close', () => {
  console.log('🔌 Redis connection closed');
  isConnected = false;
});

// Attempt initial connection
redisClient.connect().catch((err) => {
  console.warn('⚠️ Redis not available, caching disabled:', err.message);
});

// Export both client and connection status checker
module.exports = {
  redisClient,
  isRedisConnected: () => isConnected,
};
