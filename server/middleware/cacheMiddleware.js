const { redisClient, isRedisConnected } = require('../config/redisClient');

/**
 * Cache middleware for GET requests
 * @param {number} duration - Cache duration in seconds
 */
const cacheResponse = (duration) => {
  return async (req, res, next) => {
    // Skip caching if Redis is not connected
    if (!isRedisConnected()) {
      return next();
    }

    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key: user-scoped to prevent data leakage
    const userId = req.user?._id || 'anonymous';
    const cacheKey = `cache:${userId}:${req.originalUrl}`;

    try {
      // Check if cached response exists
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        console.log(`🟢 Cache HIT: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }

      console.log(`🔴 Cache MISS: ${cacheKey}`);

      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);

      res.json = (data) => {
        // Cache the response
        redisClient
          .setex(cacheKey, duration, JSON.stringify(data))
          .catch((err) => console.error('Cache write error:', err.message));

        // Send original response
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error:', err.message);
      next(); // Continue without caching on error
    }
  };
};

module.exports = { cacheResponse };
