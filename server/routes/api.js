const express = require('express');
const router = express.Router();

// Middleware to ensure user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

// Middleware to ensure user is admin
const requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  try {
    const result = await req.app.locals.db.query('SELECT is_admin FROM users WHERE id = $1', [req.session.userId]);
    if (!result.rows[0]?.is_admin) {
      return res.status(403).json({ success: false, error: 'Admin privileges required' });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// =======================
// RESPONSES API ROUTES
// =======================

// GET /api/responses - Get user responses with pagination
router.get('/responses', requireAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0, category, drafts } = req.query;
    const userId = req.session.userId;
    
    let whereClause = 'WHERE r.user_id = $1';
    let params = [userId];
    let paramCount = 1;
    
    if (category) {
      paramCount++;
      whereClause += ` AND q.category = $${paramCount}`;
      params.push(category);
    }
    
    if (drafts === 'true') {
      whereClause += ' AND r.is_draft = true';
    } else if (drafts === 'false') {
      whereClause += ' AND r.is_draft = false';
    }
    
    // Get responses with questions
    const responsesQuery = `
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.response_time_seconds,
        r.is_draft,
        r.created_at,
        r.updated_at,
        q.id as question_id,
        q.question_text,
        q.category,
        q.subcategory
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    const responses = await req.app.locals.db.query(responsesQuery, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      ${whereClause}
    `;
    
    const countResult = await req.app.locals.db.query(countQuery, params.slice(0, paramCount));
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      responses: responses.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
    
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch responses'
    });
  }
});

// POST /api/responses - Create or update response
router.post('/responses', requireAuth, async (req, res) => {
  try {
    const { questionId, responseText, responseTimeSeconds, isDraft = false } = req.body;
    const userId = req.session.userId;
    
    // Validation
    if (!questionId || !responseText?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Question ID and response text are required'
      });
    }
    
    // Check if question exists
    const questionResult = await req.app.locals.db.query(
      'SELECT id, question_text, category FROM questions WHERE id = $1 AND is_active = true',
      [questionId]
    );
    
    if (questionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }
    
    const question = questionResult.rows[0];
    
    // Check for existing non-draft response if this is not a draft
    if (!isDraft) {
      const existingResponse = await req.app.locals.db.query(
        'SELECT id FROM responses WHERE user_id = $1 AND question_id = $2 AND is_draft = false',
        [userId, questionId]
      );
      
      if (existingResponse.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'You have already answered this question'
        });
      }
    }
    
    // Calculate word count
    const wordCount = responseText.trim().split(/\\s+/).filter(word => word.length > 0).length;
    
    // Insert or update response
    const responseResult = await req.app.locals.db.query(`
      INSERT INTO responses (
        user_id, 
        question_id, 
        response_text, 
        response_time_seconds, 
        word_count, 
        is_draft
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, question_id) 
      DO UPDATE SET
        response_text = EXCLUDED.response_text,
        response_time_seconds = EXCLUDED.response_time_seconds,
        word_count = EXCLUDED.word_count,
        is_draft = EXCLUDED.is_draft,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, created_at, updated_at
    `, [userId, questionId, responseText.trim(), responseTimeSeconds || null, wordCount, isDraft]);
    
    const response = responseResult.rows[0];
    
    // Update user session stats if not a draft
    if (!isDraft) {
      const today = new Date().toISOString().split('T')[0];
      await req.app.locals.db.query(`
        INSERT INTO user_sessions (user_id, session_date, questions_answered, total_words)
        VALUES ($1, $2, 1, $3)
        ON CONFLICT (user_id, session_date)
        DO UPDATE SET
          questions_answered = user_sessions.questions_answered + 1,
          total_words = user_sessions.total_words + $3
      `, [userId, today, wordCount]);
    }
    
    res.status(201).json({
      success: true,
      response: {
        id: response.id,
        questionId,
        responseText: responseText.trim(),
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
    console.error('Error saving response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save response'
    });
  }
});

// DELETE /api/responses - Delete a response
router.delete('/responses', requireAuth, async (req, res) => {
  try {
    const { id } = req.query;
    const userId = req.session.userId;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Response ID is required'
      });
    }
    
    // Verify ownership and delete
    const result = await req.app.locals.db.query(
      'DELETE FROM responses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Response not found or access denied'
      });
    }
    
    res.json({
      success: true,
      message: 'Response deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete response'
    });
  }
});

// =======================
// QUESTIONS API ROUTES
// =======================

// GET /api/questions - Get questions for user
router.get('/questions', requireAuth, async (req, res) => {
  try {
    const { category, limit = 10, answered = 'false' } = req.query;
    const userId = req.session.userId;
    
    let query = `
      SELECT DISTINCT
        q.id,
        q.question_text,
        q.category,
        q.subcategory,
        q.difficulty_level,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END as is_answered
      FROM questions q
      LEFT JOIN responses r ON q.id = r.question_id AND r.user_id = $1 AND r.is_draft = false
      WHERE q.is_active = true
    `;
    
    let params = [userId];
    let paramCount = 1;
    
    if (category) {
      paramCount++;
      query += ` AND q.category = $${paramCount}`;
      params.push(category);
    }
    
    if (answered === 'false') {
      query += ' AND r.id IS NULL';
    } else if (answered === 'true') {
      query += ' AND r.id IS NOT NULL';
    }
    
    query += ` ORDER BY q.created_at DESC LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));
    
    const result = await req.app.locals.db.query(query, params);
    
    res.json({
      success: true,
      questions: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions'
    });
  }
});

// =======================
// AI CHAT API ROUTES
// =======================

// POST /api/ai-echo/chat - Chat with AI
router.post('/ai-echo/chat', requireAuth, async (req, res) => {
  try {
    const { message, sessionId, context = [] } = req.body;
    const userId = req.session.userId;
    
    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    // Here you would integrate with your RTX 5090 AI model at localhost:8000
    // For now, we'll simulate the response
    
    try {
      // Make request to your local AI model
      const aiResponse = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message.trim(),
          user_id: userId,
          context: context.slice(-10), // Last 10 messages for context
          session_id: sessionId
        }),
        timeout: 30000 // 30 second timeout
      });
      
      if (!aiResponse.ok) {
        throw new Error(`AI service responded with status ${aiResponse.status}`);
      }
      
      const aiData = await aiResponse.json();
      
      // Save conversation to database
      const conversationId = sessionId || `conv_${Date.now()}_${userId}`;
      
      await req.app.locals.db.query(`
        INSERT INTO ai_conversations (
          user_id,
          conversation_id,
          user_message,
          ai_response,
          created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [userId, conversationId, message.trim(), aiData.response]);
      
      res.json({
        success: true,
        message: aiData.response,
        sessionId: conversationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Fallback response when AI is unavailable
      const fallbackResponses = [
        "I'm having trouble connecting to my AI right now. Could you try again in a moment?",
        "It seems my AI processing is temporarily unavailable. Please check back shortly.",
        "I'm experiencing some technical difficulties. Your message is important to me, so please try again soon."
      ];
      
      const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      res.json({
        success: true,
        message: fallbackResponse,
        sessionId: sessionId || `fallback_${Date.now()}_${userId}`,
        timestamp: new Date().toISOString(),
        isFallback: true
      });
    }
    
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message'
    });
  }
});

// GET /api/ai-echo/sessions - Get chat sessions
router.get('/ai-echo/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { limit = 10 } = req.query;
    
    const result = await req.app.locals.db.query(`
      SELECT 
        conversation_id as session_id,
        COUNT(*) as message_count,
        MAX(created_at) as last_message_at,
        MIN(created_at) as first_message_at,
        string_agg(
          CASE WHEN char_length(user_message) > 50 
               THEN left(user_message, 47) || '...' 
               ELSE user_message 
          END, 
          ' | ' 
          ORDER BY created_at DESC
        ) as preview
      FROM ai_conversations
      WHERE user_id = $1
      GROUP BY conversation_id
      ORDER BY MAX(created_at) DESC
      LIMIT $2
    `, [userId, parseInt(limit)]);
    
    res.json({
      success: true,
      sessions: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat sessions'
    });
  }
});

// =======================
// ADMIN API ROUTES
// =======================

// GET /api/admin/stats - Get admin statistics
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    // Get various statistics
    const [userStats, responseStats, recentActivity, systemHealth] = await Promise.all([
      req.app.locals.db.query('SELECT COUNT(*) as total_users FROM users'),
      req.app.locals.db.query('SELECT COUNT(*) as total_responses FROM responses WHERE is_draft = false'),
      req.app.locals.db.query(`
        SELECT COUNT(*) as recent_responses 
        FROM responses 
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND is_draft = false
      `),
      req.app.locals.db.query('SELECT COUNT(*) as active_sessions FROM ai_conversations WHERE created_at >= CURRENT_DATE')
    ]);
    
    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(userStats.rows[0].total_users),
        totalResponses: parseInt(responseStats.rows[0].total_responses),
        recentResponses: parseInt(recentActivity.rows[0].recent_responses),
        activeSessions: parseInt(systemHealth.rows[0].active_sessions)
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics'
    });
  }
});

// GET /api/admin/users - Get user list
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;
    
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at,
        u.is_admin,
        COUNT(r.id) as response_count,
        MAX(r.created_at) as last_response_at
      FROM users u
      LEFT JOIN responses r ON u.id = r.user_id AND r.is_draft = false
    `;
    
    let params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      query += ` WHERE (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += `
      GROUP BY u.id, u.name, u.email, u.created_at, u.is_admin
      ORDER BY u.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await req.app.locals.db.query(query, params);
    
    res.json({
      success: true,
      users: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// =======================
// HEALTH CHECK ROUTES
// =======================

// GET /api/health - Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await req.app.locals.db.query('SELECT 1');
    
    // Check AI service (optional)
    let aiStatus = 'unknown';
    try {
      const aiResponse = await fetch('http://localhost:8000/health', { 
        timeout: 5000 
      });
      aiStatus = aiResponse.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      aiStatus = 'unavailable';
    }
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        ai: aiStatus
      }
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = router;