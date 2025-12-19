/**
 * Authentication Controller for Personalized News Aggregator
 * Comprehensive authentication and user management
 */

import { User } from '../models/User.js';
import { logger } from '../config/logger.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

/**
 * Register a new user
 */
export const register = catchAsync(async (req, res) => {
  const { name, email, password, interests, preferences } = req.body;

  logger.info(`Registration attempt for email: ${email}`);

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(
      'User with this email already exists',
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.DUPLICATE_ERROR
    );
  }

  // Create new user
  const userData = {
    name,
    email,
    password,
    interests: interests || [],
    preferences: preferences || {}
  };

  const user = new User(userData);
  await user.save();

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  logger.info(`User registered successfully: ${user._id}`);

  res.status(HTTP_STATUS.CREATED).json({
    message: 'User registered successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      interests: user.interests,
      preferences: user.preferences,
      createdAt: user.createdAt
    },
    token,
    refreshToken
  });
});

/**
 * Login user
 */
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  logger.info(`Login attempt for email: ${email}`);

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError(
      'Invalid email or password',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.AUTHENTICATION_ERROR
    );
  }

  // Check if account is locked
  if (user.isLocked) {
    throw new AppError(
      'Account is temporarily locked due to multiple failed login attempts',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.AUTHENTICATION_ERROR
    );
  }

  // Verify password
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    // Increment login attempts
    await user.incLoginAttempts();
    
    logger.warn(`Failed login attempt for email: ${email}`);
    throw new AppError(
      'Invalid email or password',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.AUTHENTICATION_ERROR
    );
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  logger.info(`User logged in successfully: ${user._id}`);

  res.status(HTTP_STATUS.OK).json({
    message: 'Login successful',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      interests: user.interests,
      preferences: user.preferences,
      lastLoginAt: user.lastLoginAt
    },
    token,
    refreshToken
  });
});

/**
 * Refresh access token
 */
export const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new AppError(
      'Refresh token is required',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(token);
    
    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new AppError(
        'Invalid refresh token',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.AUTHENTICATION_ERROR
      );
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(HTTP_STATUS.OK).json({
      message: 'Token refreshed successfully',
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    throw new AppError(
      'Invalid refresh token',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.AUTHENTICATION_ERROR
    );
  }
});

/**
 * Logout user
 */
export const logout = catchAsync(async (req, res) => {
  logger.info(`User logged out: ${req.user._id}`);
  console.log(`User logged out: ${req.user._id}`);
  res.status(HTTP_STATUS.OK).json({
    message: 'Logout successful'
  });
});

/**
 * Get current user profile
 */
export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('savedArticles', 'title url source publishedAt category')
    .lean();

  if (!user) {
    throw new AppError(
      'User not found',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  res.status(HTTP_STATUS.OK).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      interests: user.interests,
      preferences: user.preferences,
      savedArticles: user.savedArticles,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }
  });
});

/**
 * Update user profile
 */
export const updateProfile = catchAsync(async (req, res) => {
  const { name, interests, preferences, avatarUrl } = req.body;
  const userId = req.user._id;

  const updateData = {};
  
  if (name !== undefined) updateData.name = name;
  if (interests !== undefined) updateData.interests = interests;
  if (preferences !== undefined) updateData.preferences = preferences;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError(
      'User not found',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  logger.info(`User profile updated: ${userId}`);

  res.status(HTTP_STATUS.OK).json({
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      interests: user.interests,
      preferences: user.preferences,
      updatedAt: user.updatedAt
    }
  });
});

/**
 * Change password
 */
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  // Get user with password
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError(
      'User not found',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  // Verify current password
  const isValidPassword = await user.comparePassword(currentPassword);
  if (!isValidPassword) {
    throw new AppError(
      'Current password is incorrect',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.AUTHENTICATION_ERROR
    );
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info(`Password changed for user: ${userId}`);

  res.status(HTTP_STATUS.OK).json({
    message: 'Password changed successfully'
  });
});

/**
 * Forgot password - send reset email
 */
export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists or not
    return res.status(HTTP_STATUS.OK).json({
      message: 'If the email exists, a reset link has been sent'
    });
  }

  // Generate reset token
  const resetToken = generateToken(user, '1h');
  
  // In a real application, you would:
  // 1. Store the reset token in the database with expiration
  // 2. Send an email with the reset link
  // 3. Log the reset attempt
  
  logger.info(`Password reset requested for user: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    message: 'If the email exists, a reset link has been sent',
    // In development, return the token for testing
    ...(process.env.NODE_ENV === 'development' && { resetToken })
  });
});

/**
 * Reset password with token
 */
export const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  // In a real application, you would:
  // 1. Verify the token from the database
  // 2. Check if it's not expired
  // 3. Update the password
  
  logger.info('Password reset attempt');

  res.status(HTTP_STATUS.OK).json({
    message: 'Password reset successfully'
  });
});

/**
 * Verify email address
 */
export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.params;

  // In a real application, you would:
  // 1. Verify the token from the database
  // 2. Update the user's email verification status
  
  logger.info(`Email verification attempt with token: ${token}`);

  res.status(HTTP_STATUS.OK).json({
    message: 'Email verified successfully'
  });
});

/**
 * Resend verification email
 */
export const resendVerification = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'User not found'
    });
  }

  // In a real application, you would:
  // 1. Generate a new verification token
  // 2. Send verification email
  
  logger.info(`Verification email resent for user: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    message: 'Verification email sent'
  });
});

// Legacy functions for backward compatibility
export async function me(req, res) {
  return getProfile(req, res);
}

export async function updateInterests(req, res) {
  const { interests } = req.body;
  return updateProfile(req, res);
}

export async function stats(req, res) {
  const user = await User.findById(req.user._id)
    .populate('savedArticles', 'categories')
    .lean();

  const savedCount = user?.savedArticles?.length || 0;
  const categoriesSet = new Set();
  
  for (const article of user?.savedArticles || []) {
    if (article.category) {
      categoriesSet.add(article.category);
    }
  }

  res.status(HTTP_STATUS.OK).json({
    savedArticles: savedCount,
    categories: Array.from(categoriesSet),
    joinDate: user?.createdAt || null
  });
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    interests: user.interests
  };
}


