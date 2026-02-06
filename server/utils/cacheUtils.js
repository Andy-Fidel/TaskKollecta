const { redisClient, isRedisConnected } = require('../config/redisClient');

/**
 * Invalidate cache keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'cache:*:projects*')
 */
const invalidateCache = async (pattern) => {
  if (!isRedisConnected()) return;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`🗑️ Invalidated ${keys.length} cache keys: ${pattern}`);
    }
  } catch (err) {
    console.error('Cache invalidation error:', err.message);
  }
};

/**
 * Invalidate all cache for a specific user
 * @param {string} userId - User ID
 * @param {string} prefix - Optional route prefix (e.g., 'dashboard', 'projects')
 */
const invalidateUserCache = async (userId, prefix = '') => {
  const pattern = prefix
    ? `cache:${userId}:*${prefix}*`
    : `cache:${userId}:*`;
  await invalidateCache(pattern);
};

/**
 * Invalidate project-related cache for all users in an organization
 * @param {string} orgId - Organization ID
 */
const invalidateProjectCache = async (orgId) => {
  // Invalidate all project-related cache
  await invalidateCache(`cache:*:*/api/projects*`);
  await invalidateCache(`cache:*:*/api/dashboard*`);
};

/**
 * Invalidate task-related cache
 * @param {string} projectId - Project ID
 */
const invalidateTaskCache = async (projectId) => {
  await invalidateCache(`cache:*:*/api/tasks*`);
  await invalidateCache(`cache:*:*/api/dashboard*`);
};

module.exports = {
  invalidateCache,
  invalidateUserCache,
  invalidateProjectCache,
  invalidateTaskCache,
};
