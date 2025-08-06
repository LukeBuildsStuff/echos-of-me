const express = require('express');
const router = express.Router();
const winston = require('winston');
const aiService = require('../../services/aiService');
const { query, handleDbError } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const rateLimit = require('express-rate-limit');

/**
 * API Routes for AI Chat Integration
 * Handles communication with RTX 5090 AI model at localhost:8000
 */

// Rate limiting for AI chat endpoints
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: {
    success: false,
    error: 'AI chat rate limit exceeded. Please wait before sending another message.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/ai-chat/message
 * Send message to RTX 5090 AI and get response
 */
router.post('/message', requireAuth, aiChatLimiter, async (req, res) => {
  try {
    const {
      message,
      sessionId,
      context = [],
      temperature = 0.7,
      maxTokens = 512
    } = req.body;
    
    const userId = req.user.id;
    
    // Validation
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
        code: 'MISSING_MESSAGE'
      });
    }
    
    if (message.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message is too long (maximum 2,000 characters)',
        code: 'MESSAGE_TOO_LONG'
      });
    }
    
    const cleanMessage = message.trim();
    
    winston.info('AI chat message received', {
      userId,
      sessionId,
      messageLength: cleanMessage.length,
      contextLength: context.length
    });
    
    // Get conversation context from database if sessionId provided
    let conversationContext = context;
    if (sessionId) {
      try {
        const contextResult = await query(`
          SELECT user_message, ai_response, created_at
          FROM ai_conversations
          WHERE user_id = $1 AND session_id = $2
          ORDER BY created_at DESC
          LIMIT 10
        `, [userId, sessionId]);
        
        // Build context from recent conversation
        conversationContext = contextResult.rows.reverse().flatMap(row => [
          { role: 'user', content: row.user_message },
          { role: 'assistant', content: row.ai_response }
        ]);
      } catch (error) {
        winston.warn('Failed to fetch conversation context', {
          userId,
          sessionId,
          error: error.message
        });
      }
    }
    
    // Call RTX 5090 AI service
    try {
      const aiResponse = await aiService.chatWithAI(cleanMessage, userId, {
        context: conversationContext,
        temperature,
        maxTokens,
        sessionId
      });
      
      // Generate session ID if not provided
      const finalSessionId = sessionId || `session_${Date.now()}_${userId}`;
      
      // Save conversation to database
      try {
        await query(`
          INSERT INTO ai_conversations (
            user_id,
            session_id,
            user_message,
            ai_response,
            response_time_ms,
            confidence_score,
            model_version,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        `, [
          userId,
          finalSessionId,
          cleanMessage,
          aiResponse.response,
          aiResponse.responseTime || 1000,
          aiResponse.confidence || 0.9,
          aiResponse.metadata?.modelVersion || 'rtx5090-v1'
        ]);
        
        winston.info('AI conversation saved', {
          userId,
          sessionId: finalSessionId,
          responseLength: aiResponse.response.length,
          confidence: aiResponse.confidence
        });
        
      } catch (dbError) {
        winston.error('Failed to save AI conversation', {
          userId,
          sessionId: finalSessionId,
          error: dbError.message
        });
        // Continue despite database error
      }
      
      // Return successful response
      res.json({
        success: true,
        message: aiResponse.response,
        sessionId: finalSessionId,
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: aiResponse.confidence,
          responseTime: aiResponse.responseTime,
          source: aiResponse.metadata?.source || 'rtx5090',
          isFallback: aiResponse.metadata?.isFallback || false,
          modelVersion: aiResponse.metadata?.modelVersion
        }
      });
      
    } catch (aiError) {
      winston.error('AI service error in chat endpoint', {
        userId,
        sessionId,
        error: aiError.message,
        message: cleanMessage.substring(0, 100)
      });
      
      // Return error response
      res.status(503).json({
        success: false,
        error: 'AI service temporarily unavailable. Please try again in a moment.',
        code: 'AI_SERVICE_ERROR',
        details: process.env.NODE_ENV === 'development' ? aiError.message : undefined
      });
    }
    
  } catch (error) {
    winston.error('Error in AI chat endpoint', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/ai-chat/sessions
 * Get user's chat sessions
 */
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await query(`
      SELECT 
        session_id,
        COUNT(*) as message_count,
        MAX(created_at) as last_message_at,
        MIN(created_at) as first_message_at,
        AVG(confidence_score) as avg_confidence,
        AVG(response_time_ms) as avg_response_time,
        -- Get preview of first user message
        COALESCE(
          (SELECT user_message 
           FROM ai_conversations c2 
           WHERE c2.session_id = c1.session_id 
           AND c2.user_id = c1.user_id
           ORDER BY c2.created_at ASC 
           LIMIT 1), 
          'No messages'
        ) as session_preview
      FROM ai_conversations c1
      WHERE user_id = $1
      GROUP BY session_id
      ORDER BY MAX(created_at) DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);
    
    // Get total session count
    const countResult = await query(`
      SELECT COUNT(DISTINCT session_id) as total
      FROM ai_conversations
      WHERE user_id = $1
    `, [userId]);
    
    const total = parseInt(countResult.rows[0].total);
    
    winston.info('Chat sessions retrieved', {
      userId,
      sessionCount: result.rows.length,
      total
    });
    
    res.json({
      success: true,
      sessions: result.rows.map(row => ({
        sessionId: row.session_id,
        messageCount: parseInt(row.message_count),
        lastMessageAt: row.last_message_at,
        firstMessageAt: row.first_message_at,
        avgConfidence: parseFloat(row.avg_confidence) || 0,
        avgResponseTime: parseInt(row.avg_response_time) || 0,
        preview: row.session_preview.length > 100 
          ? row.session_preview.substring(0, 97) + '...'
          : row.session_preview
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
    
  } catch (error) {
    winston.error('Error fetching chat sessions', {
      userId: req.user?.id,
      error: error.message
    });
    
    try {
      handleDbError(error);
    } catch (dbError) {
      res.status(500).json({
        success: false,
        error: dbError.message,
        code: 'DATABASE_ERROR'
      });
    }
  }
});

/**
 * GET /api/ai-chat/sessions/:sessionId
 * Get messages from a specific chat session
 */
router.get('/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await query(`
      SELECT 
        id,
        user_message,
        ai_response,
        response_time_ms,
        confidence_score,
        model_version,
        created_at
      FROM ai_conversations
      WHERE user_id = $1 AND session_id = $2
      ORDER BY created_at ASC
      LIMIT $3 OFFSET $4
    `, [userId, sessionId, parseInt(limit), parseInt(offset)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }
    
    // Get total message count for session
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM ai_conversations
      WHERE user_id = $1 AND session_id = $2
    `, [userId, sessionId]);
    
    const total = parseInt(countResult.rows[0].total);
    
    winston.info('Chat session messages retrieved', {
      userId,
      sessionId,
      messageCount: result.rows.length,
      total
    });
    
    // Format messages for conversation display
    const messages = result.rows.flatMap(row => [
      {
        id: `${row.id}_user`,
        role: 'user',
        content: row.user_message,
        timestamp: row.created_at
      },
      {
        id: `${row.id}_assistant`,
        role: 'assistant',
        content: row.ai_response,
        timestamp: row.created_at,
        metadata: {
          confidence: row.confidence_score,
          responseTime: row.response_time_ms,
          modelVersion: row.model_version
        }
      }
    ]);
    
    res.json({
      success: true,
      sessionId,
      messages,
      pagination: {
        total: total * 2, // Each row creates 2 messages
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
    
  } catch (error) {
    winston.error('Error fetching chat session', {
      userId: req.user?.id,
      sessionId: req.params.sessionId,
      error: error.message
    });
    
    try {
      handleDbError(error);
    } catch (dbError) {
      res.status(500).json({
        success: false,
        error: dbError.message,
        code: 'DATABASE_ERROR'
      });
    }
  }
});

/**
 * DELETE /api/ai-chat/sessions/:sessionId
 * Delete a chat session
 */
router.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const result = await query(
      'DELETE FROM ai_conversations WHERE user_id = $1 AND session_id = $2 RETURNING id',
      [userId, sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }
    
    winston.info('Chat session deleted', {
      userId,
      sessionId,
      messagesDeleted: result.rows.length
    });
    
    res.json({
      success: true,
      message: 'Chat session deleted successfully',
      messagesDeleted: result.rows.length
    });
    
  } catch (error) {
    winston.error('Error deleting chat session', {
      userId: req.user?.id,
      sessionId: req.params.sessionId,
      error: error.message
    });
    
    try {
      handleDbError(error);
    } catch (dbError) {
      res.status(500).json({
        success: false,
        error: dbError.message,
        code: 'DATABASE_ERROR'
      });
    }
  }
});

/**
 * GET /api/ai-chat/health
 * Check RTX 5090 AI service health
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await aiService.checkHealth();
    const stats = aiService.getStats();
    
    winston.info('AI health check requested', {
      status: healthStatus.status,
      userId: req.user?.id
    });
    
    res.json({
      success: true,
      ai: healthStatus,
      service: {
        endpoint: stats.endpoint,
        circuitBreaker: stats.circuitBreaker,
        configuration: stats.configuration
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    winston.error('Error checking AI health', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to check AI service health',
      code: 'HEALTH_CHECK_ERROR'
    });
  }
});

/**
 * POST /api/ai-chat/reset-circuit-breaker
 * Reset AI service circuit breaker (admin only)
 */
router.post('/reset-circuit-breaker', requireAuth, async (req, res) => {
  try {
    // Check if user is admin (assuming admin check in auth middleware)
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required',
        code: 'ADMIN_REQUIRED'
      });
    }
    
    const circuitBreakerStatus = aiService.resetCircuitBreaker();
    
    winston.warn('AI circuit breaker manually reset', {
      adminUserId: req.user.id,
      adminEmail: req.user.email
    });
    
    res.json({
      success: true,
      message: 'Circuit breaker reset successfully',
      circuitBreaker: circuitBreakerStatus
    });
    
  } catch (error) {
    winston.error('Error resetting circuit breaker', {
      error: error.message,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breaker',
      code: 'RESET_ERROR'
    });
  }
});

/**
 * GET /api/ai-chat/stats
 * Get AI service statistics (admin only)
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required',
        code: 'ADMIN_REQUIRED'
      });
    }
    
    // Get database stats
    const conversationStats = await query(`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as total_sessions,
        AVG(confidence_score) as avg_confidence,
        AVG(response_time_ms) as avg_response_time,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours') as conversations_24h,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as conversations_7d
      FROM ai_conversations
    `);
    
    const stats = conversationStats.rows[0];
    const aiServiceStats = aiService.getStats();
    const healthStatus = await aiService.checkHealth();
    
    winston.info('AI stats requested', {
      adminUserId: req.user.id
    });
    
    res.json({
      success: true,
      stats: {
        conversations: {
          total: parseInt(stats.total_conversations) || 0,
          uniqueUsers: parseInt(stats.unique_users) || 0,
          totalSessions: parseInt(stats.total_sessions) || 0,
          avgConfidence: parseFloat(stats.avg_confidence) || 0,
          avgResponseTime: parseInt(stats.avg_response_time) || 0,
          last24Hours: parseInt(stats.conversations_24h) || 0,
          last7Days: parseInt(stats.conversations_7d) || 0
        },
        service: aiServiceStats,
        health: healthStatus
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    winston.error('Error fetching AI stats', {
      error: error.message,
      userId: req.user?.id
    });
    
    try {
      handleDbError(error);
    } catch (dbError) {
      res.status(500).json({
        success: false,
        error: dbError.message,
        code: 'DATABASE_ERROR'
      });
    }
  }
});

module.exports = router;