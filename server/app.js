const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3004;

// Database connection (reuse your existing config)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration (simple cookie-based auth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  
  try {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.session.userId]);
    if (result.rows[0]?.is_admin) {
      next();
    } else {
      res.status(403).render('error', { message: 'Admin access required' });
    }
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).render('error', { message: 'Server error' });
  }
};

// Routes

// Home - redirect to dashboard or login
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Login page
app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { error: null });
});

// Login POST
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT id, name, email, password_hash, is_admin FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (user && await bcrypt.compare(password, user.password_hash)) {
      req.session.userId = user.id;
      req.session.userName = user.name;
      req.session.userEmail = user.email;
      req.session.isAdmin = user.is_admin;
      
      // Redirect admin users to admin panel
      if (user.is_admin) {
        res.redirect('/admin');
      } else {
        res.redirect('/dashboard');
      }
    } else {
      res.render('auth/login', { error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', { error: 'Server error occurred' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

// Dashboard
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Get user stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_responses,
        AVG(word_count) as avg_word_count
      FROM responses 
      WHERE user_id = $1 AND is_draft = false
    `, [req.session.userId]);
    
    const stats = statsResult.rows[0];
    
    res.render('dashboard', {
      user: {
        name: req.session.userName,
        email: req.session.userEmail
      },
      stats: {
        totalResponses: parseInt(stats.total_responses) || 0,
        recentResponses: parseInt(stats.recent_responses) || 0,
        avgWordCount: Math.round(stats.avg_word_count) || 0
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('error', { message: 'Error loading dashboard' });
  }
});

// Chat interface
app.get('/chat', requireAuth, (req, res) => {
  res.render('chat', {
    user: {
      name: req.session.userName,
      email: req.session.userEmail
    }
  });
});

// Data view
app.get('/data', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    // Get user's responses with questions
    const responsesResult = await pool.query(`
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.created_at,
        q.question_text,
        q.category
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1 AND r.is_draft = false
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.session.userId, limit, offset]);
    
    // Get total count for pagination
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM responses WHERE user_id = $1 AND is_draft = false',
      [req.session.userId]
    );
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.render('data', {
      user: {
        name: req.session.userName,
        email: req.session.userEmail
      },
      responses: responsesResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        total
      }
    });
  } catch (error) {
    console.error('Data view error:', error);
    res.render('error', { message: 'Error loading data' });
  }
});

// Admin panel
app.get('/admin', requireAdmin, async (req, res) => {
  try {
    // Get system stats
    const userStats = await pool.query('SELECT COUNT(*) as total_users FROM users');
    const responseStats = await pool.query('SELECT COUNT(*) as total_responses FROM responses WHERE is_draft = false');
    const recentActivity = await pool.query(`
      SELECT COUNT(*) as recent_responses 
      FROM responses 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND is_draft = false
    `);
    
    // Get recent users
    const recentUsers = await pool.query(`
      SELECT id, name, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    res.render('admin', {
      user: {
        name: req.session.userName,
        email: req.session.userEmail
      },
      stats: {
        totalUsers: parseInt(userStats.rows[0].total_users),
        totalResponses: parseInt(responseStats.rows[0].total_responses),
        recentResponses: parseInt(recentActivity.rows[0].recent_responses)
      },
      recentUsers: recentUsers.rows
    });
  } catch (error) {
    console.error('Admin panel error:', error);
    res.render('error', { message: 'Error loading admin panel' });
  }
});

// API Routes
app.use('/api', require('./routes/api'));

// Error handling
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).render('error', { message: 'Server error occurred' });
});

// Export pool for use in API routes
app.locals.db = pool;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;