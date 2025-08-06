const winston = require('winston');
const path = require('path');

/**
 * Winston Logger Configuration
 * Provides structured logging for the Express.js application
 */

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(logColors);

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Format metadata
    const metaString = Object.keys(meta).length ? 
      `\n${JSON.stringify(meta, null, 2)}` : '';
    
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}`;
  })
);

// Development format (more readable)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Format metadata for console
    let metaString = '';
    if (Object.keys(meta).length) {
      metaString = `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

// Production format (structured JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports based on environment
const transports = [];

// Console transport (always enabled in development)
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: developmentFormat
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: productionFormat
    })
  );
}

// File transports (always enabled)
transports.push(
  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: productionFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    level: isDevelopment ? 'debug' : 'info',
    format: productionFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 10,
    tailable: true
  }),
  
  // HTTP requests log file
  new winston.transports.File({
    filename: path.join(logsDir, 'http.log'),
    level: 'http',
    format: productionFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  })
);

// Production-specific transports
if (isProduction) {
  // Daily rotate files for production
  const DailyRotateFile = require('winston-daily-rotate-file');
  
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info',
      format: productionFormat
    }),
    
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: productionFormat
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  levels: logLevels,
  format: isDevelopment ? developmentFormat : productionFormat,
  transports,
  exitOnError: false,
  
  // Exception handling
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: productionFormat
    })
  ],
  
  // Rejection handling (for unhandled promise rejections)
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: productionFormat
    })
  ]
});

// Add HTTP request logging method
logger.http = (message, meta = {}) => {
  logger.log('http', message, meta);
};

// Add database query logging method
logger.query = (message, meta = {}) => {
  if (isDevelopment) {
    logger.debug(`[DB QUERY] ${message}`, meta);
  } else {
    logger.info(`[DB QUERY] ${message}`, meta);
  }
};

// Add AI service logging method
logger.ai = (message, meta = {}) => {
  logger.info(`[AI SERVICE] ${message}`, meta);
};

// Add security logging method
logger.security = (message, meta = {}) => {
  logger.warn(`[SECURITY] ${message}`, {
    ...meta,
    timestamp: new Date().toISOString(),
    severity: 'security'
  });
};

// Performance monitoring method
logger.performance = (message, meta = {}) => {
  logger.info(`[PERFORMANCE] ${message}`, {
    ...meta,
    timestamp: new Date().toISOString()
  });
};

// Express middleware for HTTP request logging
const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  // Skip logging for health checks and static assets in production
  if (isProduction && (
    req.url.includes('/health') ||
    req.url.includes('/favicon') ||
    req.url.includes('/static/')
  )) {
    return next();
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    logger.http('HTTP Request', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      contentLength: res.get('Content-Length'),
      referrer: req.get('Referrer')
    });
  });
  
  next();
};

// Database query logger
const dbLogger = {
  query: (text, params, duration, rows) => {
    logger.query('Database query executed', {
      query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      params: params?.length || 0,
      duration: `${duration}ms`,
      rows: rows || 0,
      slow: duration > 1000
    });
  },
  
  error: (text, params, error, duration) => {
    logger.error('Database query failed', {
      query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      params: params?.length || 0,
      duration: `${duration}ms`,
      error: error.message,
      code: error.code,
      detail: error.detail
    });
  }
};

// AI service logger
const aiLogger = {
  request: (message, userId, context) => {
    logger.ai('AI request sent', {
      messageLength: message.length,
      userId,
      contextMessages: context?.length || 0
    });
  },
  
  response: (response, duration, confidence) => {
    logger.ai('AI response received', {
      responseLength: response.length,
      duration: `${duration}ms`,
      confidence
    });
  },
  
  error: (error, userId, attempt) => {
    logger.error('AI service error', {
      error: error.message,
      userId,
      attempt,
      service: 'RTX5090'
    });
  },
  
  fallback: (userId, reason) => {
    logger.warn('AI fallback response used', {
      userId,
      reason,
      service: 'RTX5090'
    });
  }
};

// Security event logger
const securityLogger = {
  loginAttempt: (email, ip, success, reason) => {
    logger.security('Login attempt', {
      email,
      ip,
      success,
      reason,
      event: 'login_attempt'
    });
  },
  
  adminAccess: (userId, email, action, ip) => {
    logger.security('Admin access', {
      userId,
      email,
      action,
      ip,
      event: 'admin_access'
    });
  },
  
  rateLimitExceeded: (ip, endpoint, limit) => {
    logger.security('Rate limit exceeded', {
      ip,
      endpoint,
      limit,
      event: 'rate_limit_exceeded'
    });
  },
  
  suspiciousActivity: (userId, activity, ip, details) => {
    logger.security('Suspicious activity detected', {
      userId,
      activity,
      ip,
      details,
      event: 'suspicious_activity'
    });
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Application shutting down gracefully');
  logger.end();
});

process.on('SIGTERM', () => {
  logger.info('Application terminated');
  logger.end();
});

// Export logger and utilities
module.exports = {
  logger,
  httpLogger,
  dbLogger,
  aiLogger,
  securityLogger
};

// Set as global for easy access
global.logger = logger;