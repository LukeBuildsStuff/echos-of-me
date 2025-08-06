const bcrypt = require('bcryptjs');
const winston = require('winston');
const { query } = require('../config/database');

/**
 * Authentication middleware for Express.js routes
 * Provides session-based authentication with enhanced security
 */

/**
 * Require authentication middleware
 * Checks if user has valid session
 */
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    // Add user info to request for easy access
    req.user = {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      isAdmin: req.session.isAdmin || false
    };
    
    winston.debug('User authenticated', {
      userId: req.user.id,
      email: req.user.email,
      route: req.path
    });
    
    next();
  } else {
    winston.info('Authentication required', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      route: req.path,
      method: req.method
    });
    
    // Return JSON for API routes, redirect for page routes
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    } else {
      return res.redirect('/login');
    }
  }
};

/**
 * Require admin privileges middleware
 * Checks if user is authenticated and has admin role
 */
const requireAdmin = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    winston.warn('Admin access attempted without authentication', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      route: req.path
    });
    
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    } else {
      return res.redirect('/login');
    }
  }
  
  try {
    // Verify admin status from database (don't trust session alone)
    const result = await query(
      'SELECT id, email, name, is_admin, admin_role_id FROM users WHERE id = $1 AND is_active = true',
      [req.session.userId]
    );
    
    if (result.rows.length === 0) {
      winston.warn('Admin check failed - user not found', {
        userId: req.session.userId,
        ip: req.ip
      });
      
      // Clear invalid session
      req.session.destroy();
      
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      } else {
        return res.redirect('/login');
      }
    }
    
    const user = result.rows[0];
    
    if (!user.is_admin) {
      winston.warn('Admin access denied - insufficient privileges', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        route: req.path
      });
      
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required',
          code: 'ADMIN_REQUIRED'
        });
      } else {
        return res.status(403).render('error', { 
          message: 'Admin access required',
          user: req.user 
        });
      }
    }
    
    // Special check for lukemoeller@yahoo.com
    if (user.email === 'lukemoeller@yahoo.com') {
      winston.info('Super admin access granted', {
        userId: user.id,
        email: user.email,
        route: req.path
      });
    }
    
    // Update request with admin user info
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: true,
      adminRoleId: user.admin_role_id
    };
    
    winston.debug('Admin authentication successful', {
      userId: user.id,
      email: user.email,
      route: req.path
    });
    
    next();
    
  } catch (error) {
    winston.error('Admin authentication error', {
      error: error.message,
      userId: req.session.userId,
      ip: req.ip,
      route: req.path
    });
    
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({
        success: false,
        error: 'Authentication system error',
        code: 'AUTH_ERROR'
      });
    } else {
      return res.status(500).render('error', { 
        message: 'Authentication system error',
        user: req.user || null
      });
    }
  }
};

/**
 * Login function for authentication
 * Validates credentials and creates session
 */
const login = async (email, password, req) => {
  try {
    winston.info('Login attempt', {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Get user with security info
    const result = await query(`
      SELECT 
        id, email, name, password_hash, is_admin, admin_role_id,
        failed_login_attempts, locked_until, is_active,
        last_login_at
      FROM users 
      WHERE email = $1
    `, [email.toLowerCase().trim()]);
    
    if (result.rows.length === 0) {
      winston.warn('Login failed - user not found', { email, ip: req.ip });
      throw new Error('Invalid email or password');
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      winston.warn('Login failed - user account inactive', { 
        userId: user.id, 
        email, 
        ip: req.ip 
      });
      throw new Error('Account is inactive');
    }
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      winston.warn('Login failed - account locked', { 
        userId: user.id, 
        email, 
        lockedUntil: user.locked_until,
        ip: req.ip 
      });
      throw new Error('Account is temporarily locked due to failed login attempts');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockAccount = newFailedAttempts >= 5;
      
      await query(`
        UPDATE users 
        SET failed_login_attempts = $1,
            locked_until = CASE 
              WHEN $2 THEN CURRENT_TIMESTAMP + INTERVAL '30 minutes'
              ELSE locked_until
            END
        WHERE id = $3
      `, [newFailedAttempts, lockAccount, user.id]);
      
      winston.warn('Login failed - invalid password', {
        userId: user.id,
        email,
        failedAttempts: newFailedAttempts,
        accountLocked: lockAccount,
        ip: req.ip
      });
      
      if (lockAccount) {
        throw new Error('Account locked due to too many failed login attempts');
      } else {
        throw new Error('Invalid email or password');
      }
    }
    
    // Reset failed login attempts and update last login
    await query(`
      UPDATE users 
      SET 
        last_login_at = CURRENT_TIMESTAMP,
        failed_login_attempts = 0,
        locked_until = NULL
      WHERE id = $1
    `, [user.id]);
    
    // Create session
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.isAdmin = user.is_admin;
    req.session.loginTime = new Date();
    
    winston.info('Login successful', {
      userId: user.id,
      email: user.email,
      isAdmin: user.is_admin,
      ip: req.ip
    });
    
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.is_admin,
        lastLogin: user.last_login_at
      }
    };
    
  } catch (error) {
    winston.error('Login error', {
      email,
      error: error.message,
      ip: req.ip
    });
    
    throw error;
  }
};

/**
 * Logout function
 * Destroys session and logs the action
 */
const logout = (req) => {
  return new Promise((resolve, reject) => {
    const userId = req.session?.userId;
    const email = req.session?.userEmail;
    
    req.session.destroy((err) => {
      if (err) {
        winston.error('Logout error', {
          userId,
          email,
          error: err.message,
          ip: req.ip
        });
        reject(err);
      } else {
        winston.info('Logout successful', {
          userId,
          email,
          ip: req.ip
        });
        resolve();
      }
    });
  });
};

/**
 * Middleware to add security headers
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

/**
 * Rate limiting for login attempts
 */
const loginAttempts = new Map();

const loginRateLimit = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;
  
  // Clean old entries
  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.firstAttempt > windowMs) {
      loginAttempts.delete(key);
    }
  }
  
  // Check current IP
  const attempts = loginAttempts.get(ip);
  
  if (attempts) {
    if (attempts.count >= maxAttempts && now - attempts.firstAttempt < windowMs) {
      winston.warn('Login rate limit exceeded', { ip, attempts: attempts.count });
      return res.status(429).json({
        success: false,
        error: 'Too many login attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    if (now - attempts.firstAttempt > windowMs) {
      // Reset counter
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
    } else {
      // Increment counter
      attempts.count++;
    }
  } else {
    // First attempt
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  }
  
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  login,
  logout,
  securityHeaders,
  loginRateLimit
};