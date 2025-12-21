/**
 * Vercel Serverless Function Entry Point
 * This file serves as the entry point for all API routes when deployed on Vercel
 */

import dotenv from 'dotenv';
dotenv.config();

import app from '../src/app.js';
import { connectToDatabase } from '../src/config/db.js';
import { connectRedis } from '../src/config/redis.js';

// Connect to database and Redis on cold start
let dbConnected = false;
let redisConnected = false;

async function ensureConnections() {
  try {
    if (!dbConnected) {
      await connectToDatabase();
      dbConnected = true;
    }
    // Redis is optional - gracefully handle failures
    if (!redisConnected) {
      try {
        await connectRedis();
        redisConnected = true;
      } catch (error) {
        console.warn('Redis connection failed (optional):', error.message);
      }
    }
  } catch (error) {
    console.error('Connection error:', error);
    // Don't throw - allow function to proceed even if connections fail initially
    // Connections will be retried on next request
  }
}

// Initialize connections once
ensureConnections().catch(console.error);

// Vercel serverless function handler
export default async function handler(req, res) {
  // Ensure database and Redis connections (retry if needed)
  await ensureConnections();
  
  // Handle the request with Express app
  // Note: Vercel's @vercel/node runtime handles Express apps automatically
  return app(req, res);
}

