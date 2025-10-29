/**
 * User Controller for Personalized News Aggregator
 * User-specific operations and saved articles management
 */

import { User } from '../models/User.js';
import { Article } from '../models/Article.js';
import { SavedArticle } from '../models/SavedArticle.js';
import { cacheService } from '../services/cacheService.js';
import { paginator } from '../utils/paginator.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

/**
 * Save an article for a user
 */
export const saveArticle = catchAsync(async (req, res) => {
  const userId = req.user._id; // Use authenticated user's ID
  const { articleId } = req.body;

  // Check if article exists
  const article = await Article.findById(articleId);
  if (!article) {
    throw new AppError(
      'Article not found',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  // Check if already saved
  const existingSaved = await SavedArticle.hasUserSavedArticle(userId, articleId);
  if (existingSaved) {
    throw new AppError(
      'Article already saved',
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.DUPLICATE_ERROR
    );
  }

  // Save article
  const savedArticle = new SavedArticle({
    userId,
    articleId,
    category: article.category,
    tags: article.tags,
    source: article.source?.name,
    metadata: {
      deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    }
  });

  await savedArticle.save();

  // Update user's saved articles
  await User.findByIdAndUpdate(userId, {
    $addToSet: { savedArticles: articleId }
  });

  // Increment article save count
  await Article.findByIdAndUpdate(articleId, { $inc: { saves: 1 } });

  logger.info(`Article ${articleId} saved by user ${userId}`);

  res.status(HTTP_STATUS.CREATED).json({
    message: 'Article saved successfully',
    savedArticle: {
      id: savedArticle._id,
      articleId,
      savedAt: savedArticle.savedAt
    }
  });
});

/**
 * Remove a saved article
 */
export const unsaveArticle = catchAsync(async (req, res) => {
  const userId = req.user._id; // Use authenticated user's ID
  const { articleId } = req.params;

  // Remove from SavedArticle collection
  const deleted = await SavedArticle.findOneAndDelete({ userId, articleId });
  
  if (!deleted) {
    throw new AppError(
      'Saved article not found',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  // Update user's saved articles
  await User.findByIdAndUpdate(userId, {
    $pull: { savedArticles: articleId }
  });

  // Decrement article save count
  await Article.findByIdAndUpdate(articleId, { $inc: { saves: -1 } });

  logger.info(`Article ${articleId} unsaved by user ${userId}`);

  res.status(HTTP_STATUS.OK).json({
    message: 'Article removed from saved list'
  });
});

/**
 * Get user's saved articles
 */
export const getSavedArticles = catchAsync(async (req, res) => {
  const userId = req.user._id; // Use authenticated user's ID
  const { page, limit, category, tags, source } = req.query;

  const cacheKey = `saved:${userId}:${JSON.stringify(req.query)}`;
  
  // Try cache first
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.status(HTTP_STATUS.OK).json(cached);
  }

  // Build options
  const options = {
    category,
    tags: tags ? tags.split(',') : undefined,
    source,
    limit: parseInt(limit) || 20,
    skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 20)
  };

  // Get saved articles
  const savedArticles = await SavedArticle.getUserSavedArticles(userId, options);

  // Get total count
  const total = await SavedArticle.countDocuments({ userId });

  // Create response
  const response = paginator.createResponse(savedArticles, total, { page, limit });

  // Cache for 5 minutes
  await cacheService.set(cacheKey, response, 300);

  res.status(HTTP_STATUS.OK).json(response);
});

/**
 * Check if article is saved by user
 */
export const isArticleSaved = catchAsync(async (req, res) => {
  const { id: userId, articleId } = req.params;

  // Verify user can check saved status for themselves or is admin
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    throw new AppError(
      'Access denied',
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.AUTHORIZATION_ERROR
    );
  }

  const savedArticle = await SavedArticle.hasUserSavedArticle(userId, articleId);

  res.status(HTTP_STATUS.OK).json({
    isSaved: !!savedArticle,
    savedAt: savedArticle?.savedAt || null
  });
});

/**
 * Get user's reading preferences
 */
export const getPreferences = catchAsync(async (req, res) => {
  const { id: userId } = req.params;

  // Verify user can access preferences for themselves or is admin
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    throw new AppError(
      'Access denied',
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.AUTHORIZATION_ERROR
    );
  }

  const user = await User.findById(userId).select('preferences interests').lean();

  if (!user) {
    throw new AppError(
      'User not found',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  res.status(HTTP_STATUS.OK).json({
    preferences: user.preferences,
    interests: user.interests
  });
});

/**
 * Update user's reading preferences
 */
export const updatePreferences = catchAsync(async (req, res) => {
  const { id: userId } = req.params;
  const { preferences, interests } = req.body;

  // Verify user can update preferences for themselves or is admin
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    throw new AppError(
      'Access denied',
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.AUTHORIZATION_ERROR
    );
  }

  const updateData = {};
  if (preferences !== undefined) updateData.preferences = preferences;
  if (interests !== undefined) updateData.interests = interests;

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

  logger.info(`User preferences updated: ${userId}`);

  res.status(HTTP_STATUS.OK).json({
    message: 'Preferences updated successfully',
    preferences: user.preferences,
    interests: user.interests
  });
});

/**
 * Get user's reading statistics
 */
export const getUserStats = catchAsync(async (req, res) => {
  const { id: userId } = req.params;

  // Verify user can access stats for themselves or is admin
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    throw new AppError(
      'Access denied',
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.AUTHORIZATION_ERROR
    );
  }

  const cacheKey = `user:stats:${userId}`;
  
  // Try cache first
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.status(HTTP_STATUS.OK).json(cached);
  }

  // Get various statistics
  const [
    totalSaved,
    categoryStats,
    tagStats,
    recentActivity
  ] = await Promise.all([
    SavedArticle.countDocuments({ userId }),
    SavedArticle.getUserCategoryStats(userId),
    SavedArticle.getUserTagStats(userId, 10),
    SavedArticle.find({ userId })
      .sort({ savedAt: -1 })
      .limit(10)
      .populate('articleId', 'title url source publishedAt')
      .lean()
  ]);

  const stats = {
    totalSaved,
    categoryBreakdown: categoryStats,
    topTags: tagStats,
    recentActivity,
    generatedAt: new Date().toISOString()
  };

  // Cache for 10 minutes
  await cacheService.set(cacheKey, stats, 600);

  res.status(HTTP_STATUS.OK).json(stats);
});

/**
 * Get user's reading engagement analytics
 */
export const getUserAnalytics = catchAsync(async (req, res) => {
  const { id: userId } = req.params;
  const { period = 30 } = req.query;

  // Verify user can access analytics for themselves or is admin
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    throw new AppError(
      'Access denied',
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.AUTHORIZATION_ERROR
    );
  }

  // Simplified analytics without analyticsService
  const savedArticles = await SavedArticle.find({ userId })
    .select('savedAt category')
    .limit(1000)
    .lean();

  const analytics = {
    totalArticles: savedArticles.length,
    period: parseInt(period),
    categoryBreakdown: {},
    generatedAt: new Date().toISOString()
  };

  savedArticles.forEach(article => {
    if (article.category) {
      analytics.categoryBreakdown[article.category] = 
        (analytics.categoryBreakdown[article.category] || 0) + 1;
    }
  });

  res.status(HTTP_STATUS.OK).json(analytics);
});

/**
 * Get user's reading recommendations
 */
export const getRecommendations = catchAsync(async (req, res) => {
  const { id: userId } = req.params;
  const { limit = 10 } = req.query;

  // Verify user can access recommendations for themselves or is admin
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    throw new AppError(
      'Access denied',
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.AUTHORIZATION_ERROR
    );
  }

  const cacheKey = `recommendations:${userId}:${limit}`;
  
  // Try cache first
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.status(HTTP_STATUS.OK).json(cached);
  }

  // Get user's interests and saved categories
  const user = await User.findById(userId).select('interests preferences').lean();
  
  if (!user) {
    throw new AppError(
      'User not found',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  // Build recommendation query based on user preferences
  const query = { isActive: true };
  
  // Add category preferences
  if (user.preferences?.categories?.length > 0) {
    query.category = { $in: user.preferences.categories };
  }
  
  // Add source preferences
  if (user.preferences?.sources?.length > 0) {
    query['source.name'] = { $in: user.preferences.sources };
  }

  // Get recommended articles
  const recommendations = await Article.find(query)
    .sort({ publishedAt: -1, saves: -1 })
    .limit(parseInt(limit))
    .lean();

  // Filter out already saved articles
  const savedArticleIds = await SavedArticle.distinct('articleId', { userId });
  const filteredRecommendations = recommendations.filter(
    article => !savedArticleIds.some(id => id.equals(article._id))
  );

  const response = {
    recommendations: filteredRecommendations,
    basedOn: {
      interests: user.interests,
      preferences: user.preferences
    },
    generatedAt: new Date().toISOString()
  };

  // Cache for 30 minutes
  await cacheService.set(cacheKey, response, 1800);

  res.status(HTTP_STATUS.OK).json(response);
});
