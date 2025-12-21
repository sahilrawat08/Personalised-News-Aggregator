/**
 * Redis configuration and connection management
 * Used for caching and rate limiting
 */

import Redis from 'ioredis';
import { logger } from './logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const NODE_ENV = process.env.NODE_ENV || 'development';

let redis = null;

/**
 * Create Redis connection
 */
export function createRedisConnection() {
  try {
    redis = new Redis(REDIS_URL, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // Enable key space notifications for cache invalidation
      keyPrefix: 'news-aggregator:',
    });

    // Event handlers
    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('ready', () => {
      logger.info('Redis ready');
    });

    redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    return redis;
  } catch (error) {
    logger.error('Failed to create Redis connection:', error);
    throw error;
  }
}

/**
 * Connect to Redis
 */
export async function connectRedis() {
  try {
    // Skip Redis connection if URL is not provided (optional for deployment)
    if (!REDIS_URL || REDIS_URL === 'redis://localhost:6379') {
      logger.warn('Redis URL not configured, skipping Redis connection');
      return null;
    }

    if (!redis) {
      redis = createRedisConnection();
    }

    await redis.connect();
    logger.info(`Connected to Redis: ${REDIS_URL}`);
    
    return redis;
  } catch (error) {
    logger.warn('Failed to connect to Redis (optional):', error.message);
    // Return null instead of throwing - Redis is optional
    return null;
  }
}

/**
 * Get Redis instance
 */
export function getRedis() {
  if (!redis) {
    redis = createRedisConnection();
  }
  return redis;
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  try {
    if (redis) {
      await redis.quit();
      redis = null;
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
}

/**
 * Redis health check
 */
export async function redisHealthCheck() {
  try {
    if (!redis) {
      return { status: 'disconnected', error: 'Redis not initialized' };
    }

    const result = await redis.ping();
    return { 
      status: result === 'PONG' ? 'healthy' : 'unhealthy',
      response: result
    };
  } catch (error) {
    return { 
      status: 'error', 
      error: error.message 
    };
  }
}

// Export the Redis instance getter
export { redis };
