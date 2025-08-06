const express = require('express');
const router = express.Router();
const winston = require('winston');
const { query, handleDbError } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

/**
 * API Routes for User Responses
 * Handles CRUD operations for the 117+ user responses
 */

/**
 * GET /api/responses
 * Get user responses with pagination and filtering
 * Preserves access to all 117 existing responses
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      category,
      drafts,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;
    
    const userId = req.user.id;
    
    // Build dynamic query
    let whereClause = 'WHERE r.user_id = $1';
    let params = [userId];
    let paramCount = 1;
    
    // Filter by category
    if (category && category !== 'all') {
      paramCount++;
      whereClause += ` AND q.category = $${paramCount}`;
      params.push(category);
    }
    
    // Filter by draft status
    if (drafts === 'true') {
      whereClause += ' AND r.is_draft = true';
    } else if (drafts === 'false') {
      whereClause += ' AND r.is_draft = false';
    }
    
    // Search in response text
    if (search && search.trim()) {
      paramCount++;
      whereClause += ` AND r.response_text ILIKE $${paramCount}`;
      params.push(`%${search.trim()}%`);
    }
    
    // Validate sort parameters
    const validSortColumns = ['created_at', 'updated_at', 'word_count', 'category'];
    const validSortOrders = ['asc', 'desc'];
    
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    // Main query to get responses with questions
    const responsesQuery = `
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.is_draft,
        r.created_at,
        r.updated_at,
        q.id as question_id,
        q.question_text,
        q.category,
        q.subcategory,
        q.difficulty_level,
        -- Calculate reading time (assuming 200 words per minute)
        CEIL(r.word_count::decimal / 200) as estimated_reading_minutes
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      ${whereClause}
      ORDER BY r.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    const responses = await query(responsesQuery, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, params.slice(0, paramCount));
    const total = parseInt(countResult.rows[0].total);
    
    // Get user statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_responses,
        COUNT(*) FILTER (WHERE is_draft = false) as published_responses,
        COUNT(*) FILTER (WHERE is_draft = true) as draft_responses,
        AVG(word_count) as avg_word_count,
        SUM(word_count) as total_words,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_responses
      FROM responses 
      WHERE user_id = $1
    `;
    
    const statsResult = await query(statsQuery, [userId]);
    const stats = statsResult.rows[0];
    
    winston.info('Responses retrieved', {
      userId,
      count: responses.rows.length,
      total,
      filters: { category, drafts, search }
    });
    
    res.json({
      success: true,
      responses: responses.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total,
        currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        totalResponses: parseInt(stats.total_responses) || 0,
        publishedResponses: parseInt(stats.published_responses) || 0,
        draftResponses: parseInt(stats.draft_responses) || 0,
        avgWordCount: Math.round(parseFloat(stats.avg_word_count)) || 0,
        totalWords: parseInt(stats.total_words) || 0,
        recentResponses: parseInt(stats.recent_responses) || 0
      }
    });
    
  } catch (error) {
    winston.error('Error fetching responses', {
      userId: req.user?.id,
      error: error.message,
      query: req.query
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
 * GET /api/responses/:id
 * Get a specific response by ID
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.is_draft,
        r.created_at,
        r.updated_at,
        q.id as question_id,
        q.question_text,
        q.category,
        q.subcategory,
        q.difficulty_level
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.id = $1 AND r.user_id = $2
    `, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Response not found',
        code: 'RESPONSE_NOT_FOUND'
      });
    }
    
    winston.info('Response retrieved', {
      userId,
      responseId: id
    });
    
    res.json({
      success: true,
      response: result.rows[0]
    });
    
  } catch (error) {
    winston.error('Error fetching response', {
      userId: req.user?.id,
      responseId: req.params.id,
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
 * POST /api/responses
 * Create or update a response
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      questionId,
      responseText,
      isDraft = false,
      responseTimeSeconds
    } = req.body;
    
    const userId = req.user.id;
    
    // Validation
    if (!questionId) {
      return res.status(400).json({
        success: false,
        error: 'Question ID is required',
        code: 'MISSING_QUESTION_ID'
      });
    }
    
    if (!responseText || !responseText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Response text is required',
        code: 'MISSING_RESPONSE_TEXT'
      });
    }
    
    if (responseText.trim().length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Response text is too long (maximum 10,000 characters)',
        code: 'RESPONSE_TOO_LONG'
      });
    }
    
    // Check if question exists and is active
    const questionResult = await query(
      'SELECT id, question_text, category FROM questions WHERE id = $1',
      [questionId]
    );
    
    if (questionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }
    
    const question = questionResult.rows[0];
    
    // Check for existing non-draft response if this is not a draft
    if (!isDraft) {
      const existingResponse = await query(
        'SELECT id FROM responses WHERE user_id = $1 AND question_id = $2 AND is_draft = false',
        [userId, questionId]
      );
      
      if (existingResponse.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'You have already answered this question',
          code: 'RESPONSE_EXISTS'
        });
      }
    }
    
    // Calculate word count
    const cleanText = responseText.trim();
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
    
    // Insert or update response
    const responseResult = await query(`
      INSERT INTO responses (
        user_id, 
        question_id, 
        response_text, 
        word_count, 
        is_draft
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, question_id) 
      DO UPDATE SET
        response_text = EXCLUDED.response_text,
        word_count = EXCLUDED.word_count,
        is_draft = EXCLUDED.is_draft,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, created_at, updated_at
    `, [userId, questionId, cleanText, wordCount, isDraft]);
    
    const response = responseResult.rows[0];
    
    winston.info('Response saved', {
      userId,
      responseId: response.id,
      questionId,
      wordCount,
      isDraft,
      isUpdate: response.created_at !== response.updated_at
    });
    
    res.status(201).json({
      success: true,
      response: {
        id: response.id,
        questionId,
        responseText: cleanText,
        wordCount,
        isDraft,
        createdAt: response.created_at,
        updatedAt: response.updated_at
      },
      question: {
        id: question.id,
        text: question.question_text,
        category: question.category
      }
    });
    
  } catch (error) {
    winston.error('Error saving response', {
      userId: req.user?.id,
      error: error.message,
      body: req.body
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
 * PUT /api/responses/:id
 * Update an existing response
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { responseText, isDraft } = req.body;
    const userId = req.user.id;
    
    // Validation
    if (!responseText || !responseText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Response text is required',
        code: 'MISSING_RESPONSE_TEXT'
      });
    }
    
    if (responseText.trim().length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Response text is too long (maximum 10,000 characters)',
        code: 'RESPONSE_TOO_LONG'
      });
    }
    
    // Calculate word count
    const cleanText = responseText.trim();
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
    
    // Update response
    const result = await query(`
      UPDATE responses 
      SET 
        response_text = $1,
        word_count = $2,
        is_draft = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING id, question_id, created_at, updated_at
    `, [cleanText, wordCount, isDraft, id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Response not found or access denied',
        code: 'RESPONSE_NOT_FOUND'
      });
    }
    
    const response = result.rows[0];
    
    winston.info('Response updated', {
      userId,
      responseId: id,
      wordCount,
      isDraft
    });
    
    res.json({
      success: true,
      response: {
        id: response.id,
        questionId: response.question_id,
        responseText: cleanText,
        wordCount,
        isDraft,
        createdAt: response.created_at,
        updatedAt: response.updated_at
      }
    });
    
  } catch (error) {
    winston.error('Error updating response', {
      userId: req.user?.id,
      responseId: req.params.id,
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
 * DELETE /api/responses/:id
 * Delete a response (soft delete by marking as inactive)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { permanent = false } = req.query;
    
    if (permanent === 'true') {
      // Permanent deletion (admin only)
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required for permanent deletion',
          code: 'ADMIN_REQUIRED'
        });
      }
      
      const result = await query(
        'DELETE FROM responses WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Response not found',
          code: 'RESPONSE_NOT_FOUND'
        });
      }
      
      winston.warn('Response permanently deleted', {
        userId,
        responseId: id,
        adminAction: true
      });
      
    } else {
      // Soft delete - mark as inactive
      const result = await query(`
        UPDATE responses 
        SET 
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `, [id, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Response not found',
          code: 'RESPONSE_NOT_FOUND'
        });
      }
      
      winston.info('Response soft deleted', {
        userId,
        responseId: id
      });
    }
    
    res.json({
      success: true,
      message: permanent === 'true' ? 'Response permanently deleted' : 'Response deleted'
    });
    
  } catch (error) {
    winston.error('Error deleting response', {
      userId: req.user?.id,
      responseId: req.params.id,
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
 * GET /api/responses/export
 * Export user responses as JSON
 */
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'json' } = req.query;
    
    const result = await query(`
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.is_draft,
        r.created_at,
        r.updated_at,
        q.question_text,
        q.category,
        q.subcategory
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1 AND r.is_active = true
      ORDER BY r.created_at ASC
    `, [userId]);
    
    winston.info('Responses exported', {
      userId,
      count: result.rows.length,
      format
    });
    
    if (format === 'csv') {
      // Convert to CSV
      const csv = [
        'ID,Question,Response,Word Count,Category,Created At',
        ...result.rows.map(row => [
          row.id,
          `"${row.question_text.replace(/"/g, '""')}"`,
          `"${row.response_text.replace(/"/g, '""')}"`,
          row.word_count,
          row.category,
          row.created_at
        ].join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="responses.csv"');
      res.send(csv);
    } else {
      // JSON format
      res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        totalResponses: result.rows.length,
        responses: result.rows
      });
    }
    
  } catch (error) {
    winston.error('Error exporting responses', {
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

module.exports = router;