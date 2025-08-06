/**
 * Main Express.js Application
 * Scalable Personal AI Clone Backend
 * 
 * Features:
 * - Preserves 117+ user responses from PostgreSQL
 * - Admin authentication for lukemoeller@yahoo.com
 * - RTX 5090 AI integration at localhost:8000
 * - Modular architecture with comprehensive error handling
 * - Session-based authentication with security features
 * - Rate limiting and performance optimization
 */

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import configurations and utilities
const config = require('./config/environment');
const { logger, httpLogger } = require('./config/logger');
const { pool } = require('./config/database');
const aiService = require('./services/aiService');

// Import middleware
const { requireAuth, requireAdmin, securityHeaders, loginRateLimit } = require('./middleware/auth');
const { 
  errorHandler, 
  notFoundHandler, 
  requestId, 
  requestLogger, 
  timeoutHandler,
  healthCheck 
} = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const pageRoutes = require('./routes/pages');

// Create Express application
const app = express();

// Trust proxy (important for accurate client IP detection)
app.set('trust proxy', 1);

// View engine setup (EJS for HTML rendering)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// ============================
// SECURITY MIDDLEWARE
// ============================

// Request ID and timeout
app.use(requestId);
app.use(timeoutHandler(30000)); // 30 second timeout

// Security headers
if (config.security.helmet.enabled) {
  app.use(helmet({
    contentSecurityPolicy: config.security.helmet.contentSecurityPolicy.enabled ? {
      directives: config.security.helmet.contentSecurityPolicy.directives
    } : false
  }));
}

app.use(securityHeaders);

// CORS configuration
if (config.security.cors.enabled) {
  app.use(cors({
    origin: config.security.cors.origin,
    credentials: config.security.cors.credentials,
    optionsSuccessStatus: 200
  }));
}

// Rate limiting
if (config.security.rateLimiting.enabled) {
  const globalLimiter = rateLimit({
    windowMs: config.security.rateLimiting.windowMs,
    max: config.security.rateLimiting.max,
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  });
  
  app.use(globalLimiter);
}

// ============================
// BASIC MIDDLEWARE
// ============================

// Request logging
app.use(httpLogger);

// Body parsing
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb'
}));

// Compression (if enabled)
if (config.performance.compression) {
  app.use(compression());
}

// Static file serving
app.use('/static', express.static(path.join(__dirname, '..', 'public'), {
  maxAge: config.isProduction ? '1d' : '0',
  etag: true,
  lastModified: true
}));

// Favicon
app.use('/favicon.ico', express.static(path.join(__dirname, '..', 'public', 'favicon.ico')));

// ============================
// SESSION CONFIGURATION
// ============================

// Session store configuration
const sessionStore = new pgSession({
  pool: pool,
  tableName: 'user_sessions',
  createTableIfMissing: true,
  pruneSessionInterval: 60 * 15, // Cleanup every 15 minutes
  errorLog: (error) => {
    logger.error('Session store error', { error: error.message });
  }
});

// Session middleware
app.use(session({
  store: sessionStore,
  secret: config.session.secret,
  name: config.session.name,
  resave: config.session.resave,
  saveUninitialized: config.session.saveUninitialized,
  cookie: config.session.cookie,
  rolling: true // Extend session on activity
}));

// Add database pool to app locals for easy access
app.locals.db = pool;
app.locals.config = config;
app.locals.aiService = aiService;

// ============================
// HEALTH CHECK ENDPOINT
// ============================

app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// ============================
// AUTHENTICATION ROUTES
// ============================

// Login rate limiting
app.use('/auth/login', loginRateLimit);
app.use('/api/auth/login', loginRateLimit);

// Authentication routes
app.use('/auth', authRoutes);

// ============================
// PAGE ROUTES (HTML)
// ============================

// Home redirect
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/login');
  }
});

// Page routes
app.use('/', pageRoutes);

// ============================
// API ROUTES
// ============================

app.use('/api', apiRoutes);

// ============================
// ADMIN ROUTES (Protected)
// ============================

// Admin panel routes
app.get('/admin', requireAdmin, async (req, res) => {
  try {
    // Get system statistics
    const stats = await getSystemStats();
    
    res.render('admin/dashboard', {
      user: req.user,
      stats,
      config: {
        environment: config.environment,
        version: config.version,
        features: config.features
      }
    });
  } catch (error) {
    logger.error('Admin dashboard error', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).render('error', {
      error: { message: 'Failed to load admin dashboard' },
      user: req.user
    });
  }
});

// Admin API routes
app.use('/admin/api', requireAdmin, require('./routes/admin'));

// ============================
// ERROR HANDLING
// ============================

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// ============================
// UTILITY FUNCTIONS
// ============================

async function getSystemStats() {
  try {
    const [userStats, responseStats, aiStats, sessionStats] = await Promise.all([
      pool.query('SELECT COUNT(*) as total_users FROM users WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as total_responses FROM responses WHERE is_draft = false'),
      pool.query(`
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(DISTINCT session_id) as total_sessions,
          AVG(confidence_score) as avg_confidence
        FROM ai_conversations
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      `),
      pool.query(`
        SELECT COUNT(*) as active_sessions 
        FROM user_sessions 
        WHERE expire > CURRENT_TIMESTAMP
      `)
    ]);
    
    const aiServiceStats = aiService.getStats();
    const aiHealth = await aiService.checkHealth();
    
    return {
      users: {
        total: parseInt(userStats.rows[0].total_users) || 0
      },
      responses: {
        total: parseInt(responseStats.rows[0].total_responses) || 0
      },
      ai: {
        conversations: parseInt(aiStats.rows[0].total_conversations) || 0,
        sessions: parseInt(aiStats.rows[0].total_sessions) || 0,
        avgConfidence: parseFloat(aiStats.rows[0].avg_confidence) || 0,
        serviceHealth: aiHealth.status,
        circuitBreakerState: aiServiceStats.circuitBreaker.state
      },
      sessions: {
        active: parseInt(sessionStats.rows[0].active_sessions) || 0
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        environment: config.environment
      }
    };
  } catch (error) {
    logger.error('Failed to get system stats', { error: error.message });
    return {
      users: { total: 0 },
      responses: { total: 0 },
      ai: { conversations: 0, sessions: 0, avgConfidence: 0 },
      sessions: { active: 0 },
      system: { uptime: process.uptime(), memory: process.memoryUsage() }
    };
  }
}

// ============================
// SERVER STARTUP
// ============================

// Graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

let server;

async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await pool.query('SELECT 1');
    logger.info('✅ Database connection established');
    
    // Test AI service
    logger.info('Testing AI service connection...');
    const aiHealth = await aiService.checkHealth();
    if (aiHealth.status === 'healthy') {
      logger.info('✅ AI service connection established');
    } else {
      logger.warn('⚠️ AI service not available, will use fallback responses');
    }
    
    // Start server
    server = app.listen(config.port, config.host, () => {
      logger.info(`🚀 Server started successfully`);
      logger.info(`   Environment: ${config.environment}`);
      logger.info(`   Port: ${config.port}`);
      logger.info(`   Host: ${config.host}`);
      logger.info(`   Version: ${config.version}`);
      logger.info(`   AI Endpoint: ${config.ai.endpoint}`);
      logger.info(`   Database: ${config.database.connectionString ? '✅ Connected' : '❌ Not connected'}`);
      logger.info(`   Redis: ${config.redis.enabled ? '✅ Enabled' : '❌ Disabled'}`);
      
      if (config.isDevelopment) {
        logger.info(`🌐 Local URL: http://localhost:${config.port}`);
        logger.info(`👤 Admin Email: lukemoeller@yahoo.com`);
      }
    });
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${config.port} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        // Close database pool
        await pool.end();
        logger.info('Database pool closed');
        
        // Shutdown AI service
        await aiService.shutdown();
        logger.info('AI service shutdown');
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;