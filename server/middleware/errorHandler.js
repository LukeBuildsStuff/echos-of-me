const winston = require('winston');

/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses and logging
 */

/**
 * Custom error classes for better error handling
 */
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Insufficient privileges') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
  }
}

class ServiceUnavailableError extends Error {
  constructor(message = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
    this.statusCode = 503;
  }
}

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isAPI = req.path.startsWith('/api/');
  
  // Extract error information
  const errorInfo = {
    message: err.message,
    name: err.name,
    stack: isDevelopment ? err.stack : undefined,
    statusCode: err.statusCode || 500,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    userEmail: req.user?.email,
    timestamp: new Date().toISOString(),
    requestId: req.id || generateRequestId()
  };
  
  // Log error with appropriate level
  const logLevel = errorInfo.statusCode >= 500 ? 'error' : 'warn';
  winston.log(logLevel, 'Request error occurred', errorInfo);
  
  // Handle specific error types
  let statusCode = 500;
  let errorMessage = 'An error occurred';
  let errorCode = 'INTERNAL_ERROR';
  let details = null;
  
  switch (err.name) {
    case 'ValidationError':
      statusCode = 400;
      errorMessage = err.message || 'Invalid input data';
      errorCode = 'VALIDATION_ERROR';
      details = { field: err.field };
      break;
      
    case 'AuthenticationError':
    case 'UnauthorizedError':
      statusCode = 401;
      errorMessage = 'Authentication required';
      errorCode = 'AUTH_REQUIRED';
      break;
      
    case 'AuthorizationError':
    case 'ForbiddenError':
      statusCode = 403;
      errorMessage = 'Insufficient privileges';
      errorCode = 'AUTHORIZATION_ERROR';
      break;
      
    case 'NotFoundError':
      statusCode = 404;
      errorMessage = err.message || 'Resource not found';
      errorCode = 'NOT_FOUND';
      break;
      
    case 'ConflictError':
      statusCode = 409;
      errorMessage = err.message || 'Resource conflict';
      errorCode = 'CONFLICT';
      break;
      
    case 'RateLimitError':
      statusCode = 429;
      errorMessage = err.message || 'Rate limit exceeded';
      errorCode = 'RATE_LIMIT_EXCEEDED';
      break;
      
    case 'ServiceUnavailableError':
      statusCode = 503;
      errorMessage = err.message || 'Service temporarily unavailable';
      errorCode = 'SERVICE_UNAVAILABLE';
      break;
      
    // Database errors
    case 'DatabaseError':
      statusCode = 500;
      errorMessage = err.message || 'Database error occurred';
      errorCode = 'DATABASE_ERROR';
      
      // Map specific PostgreSQL errors
      if (err.originalError) {
        const pgError = err.originalError;
        switch (pgError.code) {
          case '23505':
            statusCode = 409;
            errorMessage = 'A record with this information already exists';
            errorCode = 'DUPLICATE_RECORD';
            break;
          case '23503':
            statusCode = 400;
            errorMessage = 'Referenced record does not exist';
            errorCode = 'INVALID_REFERENCE';
            break;
          case '23502':
            statusCode = 400;
            errorMessage = 'Required field is missing';
            errorCode = 'MISSING_REQUIRED_FIELD';
            break;
          case '08006':
          case '08001':
            statusCode = 503;
            errorMessage = 'Database connection error';
            errorCode = 'DATABASE_CONNECTION_ERROR';
            break;
        }
      }
      break;
      
    // JSON parsing errors
    case 'SyntaxError':
      if (err.message.includes('JSON')) {
        statusCode = 400;
        errorMessage = 'Invalid JSON format';
        errorCode = 'INVALID_JSON';
      }
      break;
      
    // Multer file upload errors
    case 'MulterError':
      statusCode = 400;
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          errorMessage = 'File too large';
          errorCode = 'FILE_TOO_LARGE';
          break;
        case 'LIMIT_FILE_COUNT':
          errorMessage = 'Too many files';
          errorCode = 'TOO_MANY_FILES';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          errorMessage = 'Unexpected file field';
          errorCode = 'UNEXPECTED_FILE';
          break;
        default:
          errorMessage = 'File upload error';
          errorCode = 'FILE_UPLOAD_ERROR';
      }
      break;
      
    // Default case
    default:
      if (err.statusCode) {
        statusCode = err.statusCode;
        errorMessage = err.message || errorMessage;
      } else if (isDevelopment) {
        errorMessage = err.message || errorMessage;
      }
  }
  
  // Create error response
  const errorResponse = {
    success: false,
    error: errorMessage,
    code: errorCode,
    timestamp: errorInfo.timestamp,
    requestId: errorInfo.requestId
  };
  
  // Add details in development or for specific error types
  if (isDevelopment) {
    errorResponse.details = {
      stack: err.stack,
      originalError: err.originalError?.message,
      ...details
    };
  } else if (details) {
    errorResponse.details = details;
  }
  
  // Send appropriate response
  if (isAPI) {
    res.status(statusCode).json(errorResponse);
  } else {
    // For non-API routes, render error page
    const renderData = {
      error: {
        message: errorMessage,
        code: errorCode,
        statusCode
      },
      user: req.user || null,
      isDevelopment
    };
    
    if (isDevelopment) {
      renderData.error.stack = err.stack;
      renderData.error.details = err;
    }
    
    res.status(statusCode).render('error', renderData);
  }
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  const isAPI = req.path.startsWith('/api/');
  
  winston.info('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  
  if (isAPI) {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      code: 'ENDPOINT_NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).render('error', {
      error: {
        message: 'Page not found',
        code: 'PAGE_NOT_FOUND',
        statusCode: 404
      },
      user: req.user || null
    });
  }
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch Promise rejections
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request timeout handler
 */
const timeoutHandler = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        winston.warn('Request timeout', {
          url: req.url,
          method: req.method,
          timeout,
          userId: req.user?.id
        });
        
        const error = new ServiceUnavailableError('Request timeout');
        next(error);
      }
    }, timeout);
    
    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
  };
};

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request ID middleware
 * Adds unique ID to each request for tracking
 */
const requestId = (req, res, next) => {
  req.id = generateRequestId();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request start
  winston.info('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    requestId: req.id
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    winston.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      requestId: req.id
    });
  });
  
  next();
};

/**
 * Health check handler
 */
const healthCheck = async (req, res) => {
  try {
    // Basic health check
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    winston.error('Health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  // Error classes
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  
  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
  timeoutHandler,
  requestId,
  requestLogger,
  
  // Utilities
  healthCheck,
  generateRequestId
};