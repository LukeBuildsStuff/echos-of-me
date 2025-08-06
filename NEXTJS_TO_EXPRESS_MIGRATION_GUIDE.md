# NextJS to Express.js Migration Guide

## Overview

This guide provides step-by-step instructions for migrating your Personal AI Clone from NextJS to a scalable Express.js architecture while preserving all functionality and the 117 user responses.

## Pre-Migration Checklist

### 1. Backup Your Data
```bash
# Backup PostgreSQL database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup voice files and uploads
tar -czf voice_backup_$(date +%Y%m%d_%H%M%S).tar.gz public/voices/

# Backup environment files
cp .env.local .env.local.backup
```

### 2. Verify Current State
- [ ] Confirm 117+ user responses exist in PostgreSQL
- [ ] Verify lukemoeller@yahoo.com admin access works
- [ ] Test RTX 5090 AI model at localhost:8000
- [ ] Document current functionality that must be preserved

## Migration Steps

### Step 1: Install Dependencies

```bash
# Install Express.js and core dependencies
npm install express express-session connect-pg-simple
npm install ejs cors helmet compression
npm install express-rate-limit winston winston-daily-rotate-file
npm install bcryptjs node-fetch ioredis

# Development dependencies
npm install --save-dev nodemon concurrently
```

### Step 2: Environment Configuration

Create environment files:

```bash
# .env.development
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=postgresql://username:password@localhost:5432/your_db
SESSION_SECRET=your-super-secret-session-key-at-least-32-characters-long
RTX_ENDPOINT=http://localhost:8000
LOG_LEVEL=debug

# .env.production
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
DATABASE_URL=your-production-database-url
SESSION_SECRET=your-production-session-secret
RTX_ENDPOINT=http://rtx5090-service:8000
REDIS_URL=your-redis-url
LOG_LEVEL=info
ALLOWED_ORIGINS=https://yourdomain.com
```

### Step 3: Database Migration

Ensure your database schema is compatible:

```sql
-- Add missing columns if needed
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Create session table
CREATE TABLE IF NOT EXISTS user_sessions (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE user_sessions ADD CONSTRAINT session_pkey PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS IDX_session_expire ON user_sessions ("expire");

-- Create AI conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  response_time_ms INTEGER,
  confidence_score DECIMAL(3,2),
  model_version VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_session ON ai_conversations(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at);
```

### Step 4: File Structure Setup

Copy the provided architecture files:

```bash
# Create directory structure
mkdir -p server/{config,middleware,routes/{api,pages,admin},services,utils}
mkdir -p views/{layouts,auth,dashboard,chat,admin,error}
mkdir -p logs

# Copy architecture files (provided in previous responses)
# - server/config/database.js
# - server/config/environment.js
# - server/config/logger.js
# - server/config/performance.js
# - server/services/aiService.js
# - server/middleware/auth.js
# - server/middleware/errorHandler.js
# - server/routes/api/responses.js
# - server/routes/api/ai-chat.js
# - server/app-new.js
```

### Step 5: Create Route Files

Create the missing route files:

#### server/routes/auth.js
```javascript
const express = require('express');
const router = express.Router();
const { login, logout } = require('../middleware/auth');
const { logger } = require('../config/logger');

// GET /auth/login
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { error: null, user: null });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password, req);
    
    if (result.user.isAdmin) {
      res.redirect('/admin');
    } else {
      res.redirect('/dashboard');
    }
  } catch (error) {
    res.render('auth/login', { 
      error: error.message, 
      user: null 
    });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  try {
    await logout(req);
    res.redirect('/auth/login');
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    res.redirect('/auth/login');
  }
});

module.exports = router;
```

#### server/routes/api/index.js
```javascript
const express = require('express');
const router = express.Router();

// Import API route modules
const responsesRoutes = require('./responses');
const aiChatRoutes = require('./ai-chat');
const questionsRoutes = require('./questions');
const authRoutes = require('./auth');

// Mount API routes
router.use('/responses', responsesRoutes);
router.use('/ai-chat', aiChatRoutes);
router.use('/questions', questionsRoutes);
router.use('/auth', authRoutes);

module.exports = router;
```

### Step 6: Create View Templates

Create EJS templates for HTML rendering:

#### views/layouts/main.ejs
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title || 'Personal AI Clone' %></title>
    <link rel="stylesheet" href="/static/css/main.css">
    <link rel="icon" href="/favicon.ico">
</head>
<body>
    <header>
        <nav class="navbar">
            <div class="nav-brand">
                <a href="/">Personal AI Clone</a>
            </div>
            <% if (user) { %>
            <div class="nav-menu">
                <a href="/dashboard">Dashboard</a>
                <a href="/chat">AI Chat</a>
                <% if (user.isAdmin) { %>
                <a href="/admin">Admin</a>
                <% } %>
                <form method="POST" action="/auth/logout" style="display: inline;">
                    <button type="submit" class="btn-logout">Logout</button>
                </form>
            </div>
            <% } %>
        </nav>
    </header>
    
    <main>
        <%- body %>
    </main>
    
    <footer>
        <p>&copy; 2024 Personal AI Clone. Environment: <%= performance?.environment %></p>
    </footer>
    
    <script src="/static/js/app.js"></script>
</body>
</html>
```

#### views/auth/login.ejs
```html
<% title = 'Login - Personal AI Clone' %>

<div class="login-container">
    <div class="login-form">
        <h1>Welcome Back</h1>
        <p>Sign in to access your Personal AI Clone</p>
        
        <% if (error) { %>
        <div class="error-message">
            <%= error %>
        </div>
        <% } %>
        
        <form method="POST" action="/auth/login">
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit" class="btn-primary">Sign In</button>
        </form>
        
        <div class="admin-note">
            <small>Admin access: lukemoeller@yahoo.com</small>
        </div>
    </div>
</div>
```

### Step 7: Update Package.json Scripts

```json
{
  "scripts": {
    "dev": "NODE_ENV=development nodemon server/app-new.js",
    "start": "NODE_ENV=production node server/app-new.js",
    "build": "echo 'No build step required for Express.js'",
    "test": "NODE_ENV=test npm run test:unit",
    "migrate": "node scripts/migrate.js",
    "seed": "node scripts/seed.js"
  }
}
```

### Step 8: Preserve User Responses

Run verification script to ensure data preservation:

```javascript
// scripts/verify-migration.js
const { Pool } = require('pg');

async function verifyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Check user responses
    const responseCount = await pool.query(
      'SELECT COUNT(*) as count FROM responses WHERE is_draft = false'
    );
    
    console.log(`✅ Found ${responseCount.rows[0].count} user responses`);
    
    if (parseInt(responseCount.rows[0].count) < 117) {
      console.warn('⚠️ Response count is less than expected 117');
    }
    
    // Check admin user
    const adminUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['lukemoeller@yahoo.com']
    );
    
    if (adminUser.rows.length > 0) {
      console.log('✅ Admin user found');
      console.log(`   - Name: ${adminUser.rows[0].name}`);
      console.log(`   - Admin: ${adminUser.rows[0].is_admin}`);
    } else {
      console.error('❌ Admin user not found');
    }
    
    // Check database tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('✅ Database tables:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

verifyMigration();
```

### Step 9: Test RTX 5090 Integration

Test AI service connection:

```javascript
// scripts/test-ai-integration.js
const fetch = require('node-fetch');

async function testAIIntegration() {
  const endpoint = process.env.RTX_ENDPOINT || 'http://localhost:8000';
  
  try {
    // Test health endpoint
    console.log('Testing AI health endpoint...');
    const healthResponse = await fetch(`${endpoint}/health`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ AI service is healthy');
      console.log('   - Model loaded:', healthData.model_loaded);
      console.log('   - GPU available:', healthData.gpu_available);
    } else {
      console.error('❌ AI health check failed');
    }
    
    // Test chat endpoint
    console.log('Testing AI chat endpoint...');
    const chatResponse = await fetch(`${endpoint}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello, this is a test message.' })
    });
    
    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('✅ AI chat is working');
      console.log('   - Response length:', chatData.response?.length || 0);
      console.log('   - Confidence:', chatData.confidence);
    } else {
      console.error('❌ AI chat test failed');
    }
    
  } catch (error) {
    console.error('❌ AI integration test failed:', error.message);
    console.log('💡 Make sure RTX 5090 service is running at:', endpoint);
  }
}

testAIIntegration();
```

### Step 10: Start Migration

1. **Stop NextJS application**
2. **Run verification scripts**
3. **Start Express.js application**

```bash
# Run verification
node scripts/verify-migration.js
node scripts/test-ai-integration.js

# Start Express.js app
npm run dev
```

### Step 11: Validation Checklist

After migration, verify:

- [ ] Server starts without errors
- [ ] Database connection established
- [ ] Admin login works (lukemoeller@yahoo.com)
- [ ] User responses are accessible
- [ ] RTX 5090 AI integration working
- [ ] Chat functionality preserved
- [ ] Voice features accessible
- [ ] All 117+ responses preserved
- [ ] Performance is acceptable
- [ ] Error handling works
- [ ] Logging is functional

## Post-Migration Optimization

### Performance Monitoring

```bash
# Monitor logs
tail -f logs/combined.log

# Check performance
curl http://localhost:3000/health
```

### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_responses_user_created 
ON responses(user_id, created_at DESC);

-- Analyze table statistics
ANALYZE responses;
ANALYZE users;
```

### Security Hardening

1. **Update session secret**
2. **Enable rate limiting**
3. **Configure CORS properly**
4. **Set up SSL/TLS for production**

## Rollback Plan

If migration fails:

1. **Stop Express.js server**
2. **Restore database backup**
3. **Restart NextJS application**
4. **Investigate issues**

```bash
# Restore database
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Restart NextJS
npm run dev
```

## Production Deployment

### Docker Configuration

```dockerfile
# Dockerfile.express
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server/ ./server/
COPY views/ ./views/
COPY public/ ./public/
COPY scripts/ ./scripts/

EXPOSE 8080

CMD ["node", "server/app-new.js"]
```

### Environment Variables

Set production environment variables:
- `NODE_ENV=production`
- `DATABASE_URL` (production database)
- `REDIS_URL` (Redis cache)
- `SESSION_SECRET` (strong secret)
- `RTX_ENDPOINT` (production AI service)

## Support and Troubleshooting

### Common Issues

1. **Database connection errors**: Check DATABASE_URL
2. **Session issues**: Verify SESSION_SECRET length
3. **AI service errors**: Check RTX_ENDPOINT accessibility
4. **Missing responses**: Run verification script

### Monitoring

- Check logs in `logs/` directory
- Monitor `/health` endpoint
- Use admin panel for system stats

## Success Metrics

Migration is successful when:
- ✅ All 117+ user responses preserved
- ✅ Admin access maintained
- ✅ RTX 5090 integration working
- ✅ Performance equal or better than NextJS
- ✅ All features functional
- ✅ Error handling working
- ✅ Logging operational

This migration provides a solid foundation for scaling your Personal AI Clone while maintaining all existing functionality and data integrity.