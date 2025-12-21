/**
 * Vercel Serverless Function Entry Point
 * This file serves as the entry point for all API routes when deployed on Vercel
 */

import dotenv from 'dotenv';
dotenv.config();

import app from '../src/app.js';
import { connectToDatabase } from '../src/config/db.js';
import { connectRedis } from '../src/config/redis.js';
import mongoose from 'mongoose';

// Connection state
let connectionPromise = null;
let isConnecting = false;

/**
 * Ensure database and Redis connections
 * Uses connection pooling to avoid creating multiple connections
 */
async function ensureConnections() {
  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!isConnecting && mongoose.connection.readyState === 1) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
    });
  }

  isConnecting = true;

  // Start new connection
  connectionPromise = (async () => {
    try {
      // Connect to MongoDB
      if (mongoose.connection.readyState !== 1) {
        try {
          await connectToDatabase();
          console.log('[Vercel] Database connected');
        } catch (dbError) {
          console.error('[Vercel] Database connection error:', dbError.message);
          // Don't throw - allow function to proceed
        }
      }

      // Connect to Redis (optional)
      try {
        await connectRedis();
        console.log('[Vercel] Redis connected (optional)');
      } catch (redisError) {
        // Redis is optional, continue without it
        console.warn('[Vercel] Redis not available (optional):', redisError.message);
      }

      return true;
    } catch (error) {
      console.error('[Vercel] Connection setup error:', error.message);
      return false;
    } finally {
      isConnecting = false;
    }
  })();

  return connectionPromise;
}

// Vercel serverless function handler
export default async function handler(req, res) {
  try {
    // Ensure connections (non-blocking, won't fail the request if DB is down)
    await ensureConnections().catch(err => {
      console.error('[Vercel] Connection check failed:', err.message);
      // Continue anyway - connections may already be established or will retry
    });

    // Handle the request with Express app
    // Express will handle the request/response cycle
    app(req, res, (err) => {
      if (err) {
        console.error('[Vercel] Express error:', err);
        if (!res.headersSent) {
          return res.status(500).json({
            error: {
              message: 'Internal server error',
              code: 'EXPRESS_ERROR'
            }
          });
        }
      }
    });
  } catch (error) {
    console.error('[Vercel] Handler error:', error);
    console.error('[Vercel] Error stack:', error.stack);
    
    // Return error response if headers not sent
    if (!res.headersSent) {
      return res.status(500).json({
        error: {
          message: error.message || 'Internal server error',
          code: 'FUNCTION_ERROR',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  }
}

