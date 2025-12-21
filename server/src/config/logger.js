/**
 * Logging configuration using Winston
 * Structured logging with different levels and transports
 */

import winston from 'winston';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports
const transports = [];

// Console transport
transports.push(
  new winston.transports.Console({
    format: NODE_ENV === 'development' ? consoleFormat : logFormat,
    level: LOG_LEVEL
  })
);

// File transports for production (skip in serverless environments)
// Vercel and other serverless platforms don't support file system writes
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV;

if (NODE_ENV === 'production' && !isServerless) {
  // Error log file
  try {
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );

    // Combined log file
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
  } catch (error) {
    // If file system is not available (serverless), skip file transports
    console.warn('File logging not available, using console only');
  }
}

// Create logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'news-aggregator' },
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

// Add request ID to logs
logger.addRequestId = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || 
                  req.id || 
                  `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to logger context
  const childLogger = logger.child({ requestId: req.requestId });
  req.logger = childLogger;
  
  next();
};

// Log levels for reference
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};
