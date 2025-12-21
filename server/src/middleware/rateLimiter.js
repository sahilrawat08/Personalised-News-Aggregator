/**
 * Rate limiting middleware using Redis
 * Distributed rate limiting for API endpoints
 */

import rateLimit from 'express-rate-limit';
import { getRedis } from '../config/redis.js';
import { RATE_LIMITS, ERROR_CODES } from '../config/constants.js';
import { logger } from '../config/logger.js';

/**
 * Redis store for rate limiting
 */
class RedisStore {
  constructor() {
    try {
      this.redis = getRedis();
      // Fallback to in-memory store if Redis is not available
      this.memoryStore = this.redis ? null : new Map();
    } catch (error) {
      logger.warn('Redis not available for rate limiting, using in-memory store');
      this.redis = null;
      this.memoryStore = new Map();
    }
  }

  async increment(key, windowMs) {
    try {
      // Use Redis if available
      if (this.redis) {
        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.expire(key, Math.ceil(windowMs / 1000));
        
        const results = await pipeline.exec();
        const hits = results[0][1];
        
        return {
          totalHits: hits,
          timeRemaining: await this.redis.ttl(key)
        };
      }
      
      // Fallback to in-memory store
      if (this.memoryStore) {
        const now = Date.now();
        const record = this.memoryStore.get(key);
        
        if (!record || now > record.resetTime) {
          this.memoryStore.set(key, {
            count: 1,
            resetTime: now + windowMs
          });
          return { totalHits: 1, timeRemaining: Math.ceil(windowMs / 1000) };
        }
        
        record.count++;
        const timeRemaining = Math.ceil((record.resetTime - now) / 1000);
        return { totalHits: record.count, timeRemaining };
      }
      
      // If neither Redis nor memory store available, allow request
      return { totalHits: 1, timeRemaining: 1 };
    } catch (error) {
      logger.error('Rate limit error:', error);
      // Fallback to allowing the request
      return { totalHits: 1, timeRemaining: 1 };
    }
  }

  async decrement(key) {
    try {
      if (this.redis) {
        await this.redis.decr(key);
      } else if (this.memoryStore) {
        const record = this.memoryStore.get(key);
        if (record && record.count > 0) {
          record.count--;
        }
      }
    } catch (error) {
      logger.error('Rate limit decrement error:', error);
    }
  }

  async resetKey(key) {
    try {
      if (this.redis) {
        await this.redis.del(key);
      } else if (this.memoryStore) {
        this.memoryStore.delete(key);
      }
    } catch (error) {
      logger.error('Rate limit reset error:', error);
    }
  }
}

/**
 * Create rate limiter instance
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = RATE_LIMITS.WINDOW_MS,
    max = RATE_LIMITS.MAX_REQUESTS,
    message = 'Too many requests from this IP, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    skip = (req) => false,
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: {
        message,
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders,
    legacyHeaders,
    skip,
    keyGenerator,
    skipSuccessfulRequests,
    skipFailedRequests,
    store: new RedisStore(),
    handler: (req, res) => {
      logger.warn('Rate limit exceeded:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        requestId: req.requestId
      });

      res.status(429).json({
        error: {
          message,
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          retryAfter: Math.ceil(windowMs / 1000)
        }
      });
    }
  });
};

/**
 * General API rate limiter
 */
export const rateLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.WINDOW_MS,
  max: RATE_LIMITS.MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = createRateLimiter({
  windowMs: RATE_LIMITS.AUTH_WINDOW_MS, // 15 minutes
  max: RATE_LIMITS.AUTH_MAX_ATTEMPTS, // 5 attempts
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    // Use email if provided, otherwise IP
    const email = req.body?.email || req.body?.username;
    return email ? `auth:${email}` : `auth:${req.ip}`;
  }
});

/**
 * Article fetching rate limiter (admin only)
 */
export const fetchRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 fetches per hour
  message: 'Too many article fetch requests, please try again later.',
  keyGenerator: (req) => `fetch:${req.user._id}`
});

/**
 * Search rate limiter
 */
export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please try again later.',
  keyGenerator: (req) => {
    return req.user ? `search:${req.user._id}` : `search:${req.ip}`;
  }
});

/**
 * User action rate limiter (save, unsave, etc.)
 */
export const userActionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 actions per minute
  message: 'Too many user actions, please try again later.',
  keyGenerator: (req) => `action:${req.user._id}`
});

/**
 * Dynamic rate limiter based on user role
 */
export const dynamicRateLimiter = (req, res, next) => {
  if (!req.user) {
    return rateLimiter(req, res, next);
  }

  // Admin users have higher limits
  if (req.user.role === 'admin') {
    const adminLimiter = createRateLimiter({
      windowMs: RATE_LIMITS.WINDOW_MS,
      max: RATE_LIMITS.MAX_REQUESTS * 5, // 5x limit for admins
      keyGenerator: (req) => `admin:${req.user._id}`
    });
    return adminLimiter(req, res, next);
  }

  // Regular users use standard limiter
  return rateLimiter(req, res, next);
};

/**
 * Rate limiter for specific endpoints
 */
export const createEndpointRateLimiter = (endpoint, options = {}) => {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => `${endpoint}:${req.user ? req.user._id : req.ip}`
  });
};

/**
 * Reset rate limit for specific key
 */
export const resetRateLimit = async (key) => {
  try {
    const redis = getRedis();
    if (redis) {
      await redis.del(key);
      logger.info(`Rate limit reset for key: ${key}`);
    }
  } catch (error) {
    logger.error('Error resetting rate limit:', error);
  }
};

/**
 * Get rate limit info for a key
 */
export const getRateLimitInfo = async (key) => {
  try {
    const redis = getRedis();
    if (redis) {
      const hits = await redis.get(key);
      const ttl = await redis.ttl(key);
      
      return {
        hits: hits ? parseInt(hits) : 0,
        timeRemaining: ttl > 0 ? ttl : 0,
        limit: RATE_LIMITS.MAX_REQUESTS,
        windowMs: RATE_LIMITS.WINDOW_MS
      };
    }
    return null;
  } catch (error) {
    logger.error('Error getting rate limit info:', error);
    return null;
  }
};
