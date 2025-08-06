/**
 * Environment Configuration
 * Manages environment-specific settings for development and production
 */

const path = require('path');

// Load environment variables
require('dotenv').config({
  path: path.join(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`)
});

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease check your .env file or environment configuration.');
  process.exit(1);
}

// Environment-specific configurations
const configurations = {
  development: {
    // Server Configuration
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
    
    // Database Configuration
    database: {
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 10000,
      query_timeout: 10000,
      ssl: false
    },
    
    // Session Configuration
    session: {
      secret: process.env.SESSION_SECRET,
      name: 'luke_ai_dev_session',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
      }
    },
    
    // Redis Configuration (optional in development)
    redis: {
      enabled: process.env.REDIS_URL ? true : false,
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: 'luke_ai_dev:',
      ttl: 300 // 5 minutes default
    },
    
    // RTX 5090 AI Configuration
    ai: {
      endpoint: process.env.RTX_ENDPOINT || 'http://localhost:8000',
      timeout: 30000,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      circuitBreakerWindow: 60000
    },
    
    // Logging Configuration
    logging: {
      level: process.env.LOG_LEVEL || 'debug',
      console: true,
      files: true,
      http: true,
      maxFileSize: '5m',
      maxFiles: 5
    },
    
    // Security Configuration
    security: {
      rateLimiting: {
        enabled: false, // Disabled in development
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000 // requests per window
      },
      cors: {
        enabled: true,
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true
      },
      helmet: {
        enabled: false // Disabled for development flexibility
      }
    },
    
    // Performance Configuration
    performance: {
      compression: false, // Disabled in development
      caching: {
        enabled: false,
        ttl: 60 // 1 minute
      },
      monitoring: {
        enabled: true,
        interval: 30000 // 30 seconds
      }
    },
    
    // Feature Flags
    features: {
      aiChat: true,
      voiceCloning: true,
      adminPortal: true,
      analytics: false,
      maintenance: false
    }
  },
  
  production: {
    // Server Configuration
    port: parseInt(process.env.PORT) || 8080,
    host: process.env.HOST || '0.0.0.0',
    
    // Database Configuration
    database: {
      connectionString: process.env.DATABASE_URL,
      max: 30,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 10000,
      query_timeout: 10000,
      ssl: {
        rejectUnauthorized: false
      }
    },
    
    // Session Configuration
    session: {
      secret: process.env.SESSION_SECRET,
      name: 'luke_ai_session',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true, // HTTPS only
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      }
    },
    
    // Redis Configuration (required in production)
    redis: {
      enabled: true,
      url: process.env.REDIS_URL || process.env.REDISCLOUD_URL,
      keyPrefix: 'luke_ai:',
      ttl: 300, // 5 minutes default
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    },
    
    // RTX 5090 AI Configuration
    ai: {
      endpoint: process.env.RTX_ENDPOINT || 'http://rtx5090-service:8000',
      timeout: 30000,
      maxRetries: 3,
      circuitBreakerThreshold: 5,
      circuitBreakerWindow: 60000
    },
    
    // Logging Configuration
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      console: true,
      files: true,
      http: false, // Reduce log volume
      maxFileSize: '20m',
      maxFiles: 10,
      dailyRotate: true
    },
    
    // Security Configuration
    security: {
      rateLimiting: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // requests per window per IP
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      cors: {
        enabled: true,
        origin: process.env.ALLOWED_ORIGINS ? 
          process.env.ALLOWED_ORIGINS.split(',') : 
          ['https://yourdomain.com'],
        credentials: true
      },
      helmet: {
        enabled: true,
        contentSecurityPolicy: {
          enabled: true,
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        }
      }
    },
    
    // Performance Configuration
    performance: {
      compression: true,
      caching: {
        enabled: true,
        ttl: 300 // 5 minutes
      },
      monitoring: {
        enabled: true,
        interval: 60000 // 1 minute
      }
    },
    
    // Feature Flags
    features: {
      aiChat: true,
      voiceCloning: true,
      adminPortal: true,
      analytics: true,
      maintenance: process.env.MAINTENANCE_MODE === 'true'
    }
  },
  
  test: {
    // Test environment configuration
    port: parseInt(process.env.PORT) || 3001,
    host: 'localhost',
    
    database: {
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 1000
    },
    
    session: {
      secret: 'test-secret-key',
      name: 'luke_ai_test_session',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 60 * 60 * 1000 // 1 hour
      }
    },
    
    redis: {
      enabled: false
    },
    
    ai: {
      endpoint: 'http://localhost:8001', // Mock AI service
      timeout: 5000,
      maxRetries: 1
    },
    
    logging: {
      level: 'error', // Minimal logging in tests
      console: false,
      files: false,
      http: false
    },
    
    security: {
      rateLimiting: { enabled: false },
      cors: { enabled: false },
      helmet: { enabled: false }
    },
    
    performance: {
      compression: false,
      caching: { enabled: false },
      monitoring: { enabled: false }
    },
    
    features: {
      aiChat: true,
      voiceCloning: false,
      adminPortal: true,
      analytics: false,
      maintenance: false
    }
  }
};

// Get current environment
const environment = process.env.NODE_ENV || 'development';

// Validate environment
if (!configurations[environment]) {
  console.error(`❌ Invalid NODE_ENV: ${environment}`);
  console.error('Valid environments: development, production, test');
  process.exit(1);
}

// Get configuration for current environment
const config = configurations[environment];

// Add environment metadata
config.environment = environment;
config.isDevelopment = environment === 'development';
config.isProduction = environment === 'production';
config.isTest = environment === 'test';
config.version = process.env.npm_package_version || '1.0.0';
config.buildTime = new Date().toISOString();

// Validate configuration
function validateConfig(config) {
  const errors = [];
  
  // Required configurations
  if (!config.database.connectionString) {
    errors.push('Database connection string is required');
  }
  
  if (!config.session.secret || config.session.secret.length < 32) {
    errors.push('Session secret must be at least 32 characters');
  }
  
  if (config.isProduction) {
    if (!config.redis.enabled || !config.redis.url) {
      errors.push('Redis is required in production');
    }
    
    if (!config.session.cookie.secure) {
      errors.push('Secure cookies are required in production');
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }
  
  return true;
}

// Validate configuration
validateConfig(config);

// Log configuration (excluding sensitive data)
console.log(`🚀 Environment: ${environment}`);
console.log(`📊 Configuration loaded:`);
console.log(`   - Port: ${config.port}`);
console.log(`   - Database: ${config.database.connectionString ? '✓ Connected' : '✗ Not configured'}`);
console.log(`   - Redis: ${config.redis.enabled ? '✓ Enabled' : '✗ Disabled'}`);
console.log(`   - AI Service: ${config.ai.endpoint}`);
console.log(`   - Logging Level: ${config.logging.level}`);
console.log(`   - Rate Limiting: ${config.security.rateLimiting.enabled ? '✓ Enabled' : '✗ Disabled'}`);

module.exports = config;