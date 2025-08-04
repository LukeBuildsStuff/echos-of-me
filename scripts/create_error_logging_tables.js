const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'echosofme'
};

async function createErrorLoggingTables() {
  let connection;
  
  try {
    console.log('🔧 Connecting to database for error logging system setup...');
    connection = await mysql.createConnection(DB_CONFIG);
    
    // Error Categories Table
    console.log('📊 Creating error_categories table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        category_code VARCHAR(50) NOT NULL UNIQUE,
        severity_level ENUM('info', 'warning', 'critical', 'emergency') NOT NULL DEFAULT 'warning',
        family_impact_level ENUM('none', 'low', 'medium', 'high', 'severe') NOT NULL DEFAULT 'low',
        description TEXT,
        auto_escalate BOOLEAN DEFAULT FALSE,
        notification_required BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default error categories
    console.log('📝 Inserting default error categories...');
    const defaultCategories = [
      ['Authentication Failure', 'AUTH_FAIL', 'warning', 'low', 'User authentication or authorization failed', false, true],
      ['Database Error', 'DB_ERROR', 'critical', 'high', 'Database connection or query failure affecting family data', true, true],
      ['AI Model Error', 'AI_ERROR', 'critical', 'high', 'AI model inference or training failure affecting family conversations', true, true],
      ['API Error', 'API_ERROR', 'warning', 'medium', 'API endpoint failure or timeout', false, true],
      ['Memory Storage Error', 'MEMORY_ERROR', 'critical', 'severe', 'Failure to store or retrieve precious family memories', true, true],
      ['Voice Processing Error', 'VOICE_ERROR', 'warning', 'medium', 'Voice recording or synthesis failure', false, true],
      ['Frontend Error', 'FRONTEND_ERROR', 'warning', 'low', 'Client-side JavaScript error', false, false],
      ['Performance Issue', 'PERFORMANCE', 'info', 'low', 'Slow response or high resource usage', false, false],
      ['Crisis Detection Error', 'CRISIS_ERROR', 'emergency', 'severe', 'Failure in grief crisis detection system', true, true],
      ['Privacy Breach', 'PRIVACY_BREACH', 'emergency', 'severe', 'Potential unauthorized access to family data', true, true],
      ['Training Pipeline Error', 'TRAINING_ERROR', 'critical', 'medium', 'AI training pipeline failure', true, true],
      ['Build Error', 'BUILD_ERROR', 'warning', 'low', 'Webpack or build system error', false, false]
    ];
    
    for (const category of defaultCategories) {
      await connection.execute(`
        INSERT IGNORE INTO error_categories 
        (category_name, category_code, severity_level, family_impact_level, description, auto_escalate, notification_required)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, category);
    }
    
    // Error Logs Table
    console.log('📋 Creating error_logs table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        error_id VARCHAR(255) NOT NULL UNIQUE,
        category_id INT,
        severity ENUM('info', 'warning', 'critical', 'emergency') NOT NULL,
        family_impact ENUM('none', 'low', 'medium', 'high', 'severe') NOT NULL DEFAULT 'none',
        title VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        stack_trace TEXT,
        error_context JSON,
        user_id INT NULL,
        family_id INT NULL,
        affected_feature VARCHAR(255),
        user_agent TEXT,
        ip_address VARCHAR(45),
        request_url TEXT,
        request_method VARCHAR(10),
        request_headers JSON,
        response_status INT,
        session_id VARCHAR(255),
        environment VARCHAR(50) DEFAULT 'production',
        server_instance VARCHAR(100),
        memory_usage_mb INT,
        cpu_usage_percent DECIMAL(5,2),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        resolved_by INT NULL,
        resolution_notes TEXT,
        grief_context_detected BOOLEAN DEFAULT FALSE,
        crisis_indicator BOOLEAN DEFAULT FALSE,
        family_notification_sent BOOLEAN DEFAULT FALSE,
        escalated_to_support BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (category_id) REFERENCES error_categories(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (resolved_by) REFERENCES users(id),
        INDEX idx_severity (severity),
        INDEX idx_family_impact (family_impact),
        INDEX idx_timestamp (timestamp),
        INDEX idx_resolved (resolved_at),
        INDEX idx_user_id (user_id),
        INDEX idx_family_id (family_id),
        INDEX idx_crisis (crisis_indicator),
        INDEX idx_grief_context (grief_context_detected)
      )
    `);
    
    // Error Resolution Tracking Table
    console.log('🔄 Creating error_resolutions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_resolutions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        error_log_id INT NOT NULL,
        resolution_type ENUM('fixed', 'workaround', 'duplicate', 'wont_fix', 'monitoring') NOT NULL,
        resolver_id INT NOT NULL,
        resolution_time_minutes INT,
        steps_taken TEXT,
        root_cause TEXT,
        prevention_measures TEXT,
        family_communication_sent BOOLEAN DEFAULT FALSE,
        family_communication_message TEXT,
        follow_up_required BOOLEAN DEFAULT FALSE,
        follow_up_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (error_log_id) REFERENCES error_logs(id) ON DELETE CASCADE,
        FOREIGN KEY (resolver_id) REFERENCES users(id)
      )
    `);
    
    // Error Analytics Table
    console.log('📈 Creating error_analytics table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_analytics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        date_hour TIMESTAMP NOT NULL,
        category_id INT,
        severity ENUM('info', 'warning', 'critical', 'emergency') NOT NULL,
        error_count INT DEFAULT 0,
        affected_families_count INT DEFAULT 0,
        avg_resolution_time_minutes DECIMAL(10,2),
        grief_context_count INT DEFAULT 0,
        crisis_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (category_id) REFERENCES error_categories(id),
        UNIQUE KEY unique_hour_category_severity (date_hour, category_id, severity),
        INDEX idx_date_hour (date_hour),
        INDEX idx_category_severity (category_id, severity)
      )
    `);
    
    // Error Context Patterns Table for AI-driven pattern recognition
    console.log('🤖 Creating error_context_patterns table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_context_patterns (
        id INT PRIMARY KEY AUTO_INCREMENT,
        pattern_name VARCHAR(255) NOT NULL,
        pattern_signature VARCHAR(500) NOT NULL,
        category_id INT,
        occurrence_count INT DEFAULT 1,
        first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        pattern_confidence DECIMAL(3,2) DEFAULT 0.80,
        family_impact_prediction ENUM('none', 'low', 'medium', 'high', 'severe'),
        suggested_action TEXT,
        auto_resolution_script TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (category_id) REFERENCES error_categories(id),
        UNIQUE KEY unique_pattern_signature (pattern_signature),
        INDEX idx_pattern_confidence (pattern_confidence),
        INDEX idx_occurrence_count (occurrence_count)
      )
    `);
    
    // Family Impact Notifications Table
    console.log('💙 Creating family_impact_notifications table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS family_impact_notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        error_log_id INT NOT NULL,
        family_id INT,
        user_id INT,
        notification_type ENUM('email', 'in_app', 'sms', 'phone') NOT NULL,
        message_template VARCHAR(100),
        personalized_message TEXT,
        compassionate_tone BOOLEAN DEFAULT TRUE,
        sent_at TIMESTAMP NULL,
        acknowledged_at TIMESTAMP NULL,
        family_response TEXT,
        support_offered BOOLEAN DEFAULT FALSE,
        counseling_referral BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (error_log_id) REFERENCES error_logs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_family_id (family_id),
        INDEX idx_sent_at (sent_at),
        INDEX idx_acknowledged (acknowledged_at)
      )
    `);
    
    console.log('✅ Error logging system tables created successfully!');
    console.log('');
    console.log('🎯 System Features:');
    console.log('   • Comprehensive error tracking with grief-sensitive context');
    console.log('   • Real-time family impact assessment');
    console.log('   • Crisis detection and escalation workflows');
    console.log('   • AI-powered pattern recognition for proactive resolution');
    console.log('   • Compassionate family communication templates');
    console.log('   • Performance analytics and trend analysis');
    console.log('   • Automated resolution suggestions');
    console.log('');
    console.log('💝 Family-First Design:');
    console.log('   • Every error is evaluated for family impact');
    console.log('   • Grief context detection for sensitive handling');
    console.log('   • Compassionate communication when families are affected');
    console.log('   • Crisis intervention workflows for urgent situations');
    console.log('   • Memory preservation protection as highest priority');
    
  } catch (error) {
    console.error('❌ Error creating error logging tables:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  createErrorLoggingTables()
    .then(() => {
      console.log('🌟 Error logging system setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💔 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createErrorLoggingTables };