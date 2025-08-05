const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function createAdminTables() {
  const client = await pool.connect()
  
  try {
    console.log('Creating admin-related tables...')
    
    // System settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        setting_type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Security events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) DEFAULT 'low',
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        resolved BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Blocked IPs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address INET NOT NULL UNIQUE,
        reason TEXT NOT NULL,
        blocked_by VARCHAR(255),
        attempts INTEGER DEFAULT 0,
        last_attempt TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // User sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        ip_address INET,
        user_agent TEXT,
        location TEXT,
        device_info JSONB,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Admin audit log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_email VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(255),
        resource_id VARCHAR(255),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Analytics events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        session_id VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        page_url TEXT,
        referrer TEXT,
        user_agent TEXT,
        ip_address INET,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // System metrics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_type VARCHAR(100) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL,
        metric_data JSONB,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
      CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_system_metrics_type_name ON system_metrics(metric_type, metric_name);
    `)
    
    // Insert default system settings
    const defaultSettings = [
      ['general.siteName', 'Echoes of Me', 'string', 'Application name'],
      ['general.siteDescription', 'AI-powered personal legacy platform', 'string', 'Application description'],
      ['general.maintenanceMode', 'false', 'boolean', 'Enable maintenance mode'],
      ['general.allowRegistration', 'true', 'boolean', 'Allow new user registration'],
      ['general.requireEmailVerification', 'true', 'boolean', 'Require email verification for new users'],
      ['security.passwordMinLength', '8', 'number', 'Minimum password length'],
      ['security.passwordRequireSpecialChars', 'true', 'boolean', 'Require special characters in passwords'],
      ['security.sessionTimeout', '3600', 'number', 'Session timeout in seconds'],
      ['security.maxLoginAttempts', '5', 'number', 'Maximum failed login attempts before lockout'],
      ['security.enableTwoFactor', 'false', 'boolean', 'Enable two-factor authentication'],
      ['ai.defaultModel', 'gpt-4', 'string', 'Default AI model to use'],
      ['ai.maxTrainingTime', '7200', 'number', 'Maximum training time in seconds'],
      ['ai.maxResponseLength', '2000', 'number', 'Maximum response length in characters'],
      ['ai.enableContentModeration', 'true', 'boolean', 'Enable automatic content moderation'],
      ['ai.trainingQueueLimit', '10', 'number', 'Maximum number of jobs in training queue'],
      ['monitoring.enableMetrics', 'true', 'boolean', 'Enable system metrics collection'],
      ['monitoring.retentionDays', '30', 'number', 'Number of days to retain metrics'],
      ['monitoring.alertThresholds', '{"cpu": 80, "memory": 85, "disk": 90, "responseTime": 2000}', 'json', 'Alert thresholds for system monitoring']
    ]
    
    for (const [key, value, type, description] of defaultSettings) {
      await client.query(`
        INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (setting_key) DO NOTHING
      `, [key, value, type, description])
    }
    
    // Update users table to ensure admin columns exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS primary_role VARCHAR(50) DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS secondary_roles TEXT[],
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255)
    `)
    
    // Create admin user if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@echosofme.com'
    const adminExists = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail])
    
    if (adminExists.rows.length === 0) {
      await client.query(`
        INSERT INTO users (email, name, is_admin, primary_role, email_verified, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [adminEmail, 'System Administrator', true, 'admin', true])
      
      console.log(`Created admin user: ${adminEmail}`)
    }
    
    console.log('Admin tables created successfully!')
    
  } catch (error) {
    console.error('Error creating admin tables:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run the function
createAdminTables()
  .then(() => {
    console.log('Database setup completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('Database setup failed:', error)
    process.exit(1)
  })