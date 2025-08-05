const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function createComprehensiveAdminTables() {
  const client = await pool.connect()
  
  try {
    console.log('Creating comprehensive admin portal tables...')
    
    // 1. Admin roles and permissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        permissions JSONB NOT NULL DEFAULT '{}',
        is_system_role BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        permission_name VARCHAR(100) UNIQUE NOT NULL,
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 2. Family relationships and structure
    await client.query(`
      CREATE TABLE IF NOT EXISTS families (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_name VARCHAR(255) NOT NULL,
        primary_contact_id UUID REFERENCES users(id) ON DELETE SET NULL,
        family_story TEXT,
        location VARCHAR(255),
        phone_number VARCHAR(20),
        emergency_contact_email VARCHAR(255),
        support_status VARCHAR(50) DEFAULT 'stable' CHECK (support_status IN ('stable', 'monitoring', 'intervention')),
        privacy_level VARCHAR(50) DEFAULT 'standard' CHECK (privacy_level IN ('standard', 'high', 'maximum')),
        memorial_status BOOLEAN DEFAULT FALSE,
        memorial_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS family_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_role VARCHAR(50) NOT NULL CHECK (family_role IN ('primary', 'partner', 'child', 'sibling', 'parent', 'extended')),
        relationship_description VARCHAR(255),
        is_guardian BOOLEAN DEFAULT FALSE,
        can_manage_family BOOLEAN DEFAULT FALSE,
        emotional_support_needed BOOLEAN DEFAULT FALSE,
        support_notes TEXT,
        joined_family_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(family_id, user_id)
      )
    `)

    // 3. Crisis detection and support
    await client.query(`
      CREATE TABLE IF NOT EXISTS crisis_detection_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_id UUID REFERENCES families(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 10),
        ai_confidence_score DECIMAL(3,2),
        trigger_content TEXT,
        sentiment_analysis JSONB,
        keywords_detected TEXT[],
        response_suggestion TEXT,
        auto_escalated BOOLEAN DEFAULT FALSE,
        human_reviewed BOOLEAN DEFAULT FALSE,
        reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        review_notes TEXT,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_positive', 'escalated')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_id UUID REFERENCES families(id) ON DELETE SET NULL,
        crisis_event_id UUID REFERENCES crisis_detection_events(id) ON DELETE SET NULL,
        support_admin_email VARCHAR(255),
        interaction_type VARCHAR(100) NOT NULL,
        interaction_medium VARCHAR(50) CHECK (interaction_medium IN ('email', 'phone', 'chat', 'video', 'in_person')),
        interaction_summary TEXT NOT NULL,
        follow_up_required BOOLEAN DEFAULT FALSE,
        follow_up_date DATE,
        emotional_assessment JSONB,
        resources_provided TEXT[],
        outcome VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 4. Enhanced audit logging
    await client.query(`
      CREATE TABLE IF NOT EXISTS comprehensive_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        admin_email VARCHAR(255) NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255),
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        target_family_id UUID REFERENCES families(id) ON DELETE SET NULL,
        action_details JSONB,
        before_state JSONB,
        after_state JSONB,
        ip_address INET,
        user_agent TEXT,
        session_id VARCHAR(255),
        risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
        compliance_relevant BOOLEAN DEFAULT FALSE,
        retention_period_days INTEGER DEFAULT 2555, -- 7 years for compliance
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 5. Privacy and GDPR compliance
    await client.query(`
      CREATE TABLE IF NOT EXISTS privacy_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        family_id UUID REFERENCES families(id) ON DELETE SET NULL,
        request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'deletion', 'portability', 'rectification', 'restriction')),
        request_details TEXT,
        legal_basis VARCHAR(100),
        processing_admin_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'partially_completed')),
        status_reason TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        verification_method VARCHAR(100),
        data_exported_path VARCHAR(500),
        deletion_confirmation JSONB,
        compliance_notes TEXT
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS data_processing_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        family_id UUID REFERENCES families(id) ON DELETE SET NULL,
        activity_type VARCHAR(100) NOT NULL,
        data_categories TEXT[] NOT NULL,
        processing_purpose VARCHAR(255) NOT NULL,
        legal_basis VARCHAR(100) NOT NULL,
        retention_period_days INTEGER,
        third_party_sharing BOOLEAN DEFAULT FALSE,
        third_parties JSONB,
        automated_decision_making BOOLEAN DEFAULT FALSE,
        user_consent_given BOOLEAN DEFAULT FALSE,
        consent_timestamp TIMESTAMP,
        consent_withdrawn BOOLEAN DEFAULT FALSE,
        consent_withdrawn_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 6. AI conversation analytics
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_conversation_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_id UUID REFERENCES families(id) ON DELETE SET NULL,
        conversation_id VARCHAR(255),
        model_version VARCHAR(100),
        conversation_quality_score DECIMAL(3,2),
        emotional_resonance_score DECIMAL(3,2),
        memory_accuracy_score DECIMAL(3,2),
        user_satisfaction_indicated BOOLEAN,
        conversation_length INTEGER,
        response_time_avg_ms INTEGER,
        topics_covered TEXT[],
        emotional_themes TEXT[],
        memory_references_count INTEGER,
        harmful_content_detected BOOLEAN DEFAULT FALSE,
        content_moderation_flags TEXT[],
        improvement_suggestions TEXT[],
        training_value_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 7. Family engagement metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_engagement_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        metric_date DATE DEFAULT CURRENT_DATE,
        active_members_count INTEGER DEFAULT 0,
        total_memories_shared INTEGER DEFAULT 0,
        ai_interactions_count INTEGER DEFAULT 0,
        quality_interactions_count INTEGER DEFAULT 0,
        support_requests_count INTEGER DEFAULT 0,
        healing_progress_indicators JSONB,
        family_cohesion_score DECIMAL(3,2),
        grief_stage_assessment JSONB,
        engagement_trends JSONB,
        alerts_generated INTEGER DEFAULT 0,
        positive_milestones TEXT[],
        concerns_identified TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(family_id, metric_date)
      )
    `)

    // 8. User shadowing/impersonation tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_shadowing_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        shadow_reason VARCHAR(255) NOT NULL,
        supervisor_approval BOOLEAN DEFAULT FALSE,
        supervisor_email VARCHAR(255),
        privacy_level VARCHAR(50) DEFAULT 'read_only' CHECK (privacy_level IN ('read_only', 'limited_interaction', 'full_support')),
        session_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_ended_at TIMESTAMP,
        actions_performed JSONB DEFAULT '[]',
        sensitive_data_accessed BOOLEAN DEFAULT FALSE,
        session_notes TEXT,
        is_active BOOLEAN DEFAULT TRUE
      )
    `)

    // 9. Password reset tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_by_admin BOOLEAN DEFAULT FALSE,
        admin_email VARCHAR(255),
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id) -- Only one active token per user
      )
    `)

    // Add foreign key constraints and enhance users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS admin_role_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS last_shadow_session TIMESTAMP,
      ADD COLUMN IF NOT EXISTS privacy_preferences JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS crisis_contact_info JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS grief_support_opt_in BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS memorial_account BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS memorial_contact_id UUID REFERENCES users(id) ON DELETE SET NULL
    `)

    // Create comprehensive indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_families_primary_contact ON families(primary_contact_id);
      CREATE INDEX IF NOT EXISTS idx_families_support_status ON families(support_status);
      CREATE INDEX IF NOT EXISTS idx_families_memorial_status ON families(memorial_status);
      
      CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
      CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(family_role);
      CREATE INDEX IF NOT EXISTS idx_family_members_support_needed ON family_members(emotional_support_needed);
      
      CREATE INDEX IF NOT EXISTS idx_crisis_events_user_id ON crisis_detection_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_crisis_events_family_id ON crisis_detection_events(family_id);
      CREATE INDEX IF NOT EXISTS idx_crisis_events_severity ON crisis_detection_events(severity_level);
      CREATE INDEX IF NOT EXISTS idx_crisis_events_status ON crisis_detection_events(status);
      CREATE INDEX IF NOT EXISTS idx_crisis_events_created_at ON crisis_detection_events(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_support_interactions_user_id ON support_interactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_interactions_family_id ON support_interactions(family_id);
      CREATE INDEX IF NOT EXISTS idx_support_interactions_created_at ON support_interactions(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_audit_log_admin_email ON comprehensive_audit_log(admin_email);
      CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON comprehensive_audit_log(action_type);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON comprehensive_audit_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_log_target_user ON comprehensive_audit_log(target_user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_risk_level ON comprehensive_audit_log(risk_level);
      
      CREATE INDEX IF NOT EXISTS idx_privacy_requests_user_id ON privacy_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status);
      CREATE INDEX IF NOT EXISTS idx_privacy_requests_type ON privacy_requests(request_type);
      
      CREATE INDEX IF NOT EXISTS idx_ai_analytics_user_id ON ai_conversation_analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_analytics_family_id ON ai_conversation_analytics(family_id);
      CREATE INDEX IF NOT EXISTS idx_ai_analytics_created_at ON ai_conversation_analytics(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_engagement_metrics_family_date ON family_engagement_metrics(family_id, metric_date);
      
      CREATE INDEX IF NOT EXISTS idx_shadowing_admin_user ON user_shadowing_sessions(admin_user_id);
      CREATE INDEX IF NOT EXISTS idx_shadowing_target_user ON user_shadowing_sessions(target_user_id);
      CREATE INDEX IF NOT EXISTS idx_shadowing_active ON user_shadowing_sessions(is_active);
      CREATE INDEX IF NOT EXISTS idx_shadowing_started_at ON user_shadowing_sessions(session_started_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
    `)

    // Insert default admin roles
    const adminRoles = [
      ['super_admin', 'Super Administrator', 'Full system access with all permissions', {
        "users": ["create", "read", "update", "delete", "shadow"],
        "families": ["create", "read", "update", "delete", "manage"],
        "admin": ["create", "read", "update", "delete"],
        "analytics": ["read", "export"],
        "crisis": ["read", "respond", "escalate"],
        "privacy": ["read", "process", "approve"],
        "audit": ["read", "export"],
        "system": ["configure", "maintain", "backup"]
      }, true],
      ['family_support', 'Family Support Specialist', 'Support families with grief and emotional assistance', {
        "users": ["read", "update"],
        "families": ["read", "update", "support"],
        "crisis": ["read", "respond"],
        "analytics": ["read"],
        "support": ["create", "read", "update"]
      }, true],
      ['technical_support', 'Technical Support', 'Technical assistance and system troubleshooting', {
        "users": ["read"],
        "families": ["read"],
        "system": ["read", "troubleshoot"],
        "analytics": ["read"],
        "audit": ["read"]
      }, true],
      ['privacy_officer', 'Privacy Officer', 'Handle GDPR and privacy compliance requests', {
        "privacy": ["read", "process", "approve", "delete"],
        "audit": ["read", "export"],
        "users": ["read"],
        "families": ["read"]
      }, true],
      ['crisis_responder', 'Crisis Response Team', 'Emergency mental health and crisis intervention', {
        "crisis": ["read", "respond", "escalate"],
        "users": ["read", "shadow"],
        "families": ["read", "support"],
        "support": ["create", "read", "update"]
      }, true]
    ]

    for (const [roleName, displayName, description, permissions, isSystem] of adminRoles) {
      await client.query(`
        INSERT INTO admin_roles (role_name, display_name, description, permissions, is_system_role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (role_name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          permissions = EXCLUDED.permissions,
          updated_at = CURRENT_TIMESTAMP
      `, [roleName, displayName, description, JSON.stringify(permissions), isSystem])
    }

    // Insert default admin permissions
    const permissions = [
      ['users.create', 'users', 'create', 'Create new user accounts'],
      ['users.read', 'users', 'read', 'View user information'],
      ['users.update', 'users', 'update', 'Modify user accounts'],
      ['users.delete', 'users', 'delete', 'Delete user accounts'],
      ['users.shadow', 'users', 'shadow', 'Impersonate users for support'],
      ['families.create', 'families', 'create', 'Create family groups'],
      ['families.read', 'families', 'read', 'View family information'],
      ['families.update', 'families', 'update', 'Modify family settings'],
      ['families.delete', 'families', 'delete', 'Delete family groups'],
      ['families.manage', 'families', 'manage', 'Full family management'],
      ['families.support', 'families', 'support', 'Provide family support'],
      ['crisis.read', 'crisis', 'read', 'View crisis events'],
      ['crisis.respond', 'crisis', 'respond', 'Respond to crisis situations'],
      ['crisis.escalate', 'crisis', 'escalate', 'Escalate crisis events'],
      ['privacy.read', 'privacy', 'read', 'View privacy requests'],
      ['privacy.process', 'privacy', 'process', 'Process privacy requests'],
      ['privacy.approve', 'privacy', 'approve', 'Approve privacy actions'],
      ['privacy.delete', 'privacy', 'delete', 'Execute data deletion'],
      ['analytics.read', 'analytics', 'read', 'View analytics data'],
      ['analytics.export', 'analytics', 'export', 'Export analytics reports'],
      ['audit.read', 'audit', 'read', 'View audit logs'],
      ['audit.export', 'audit', 'export', 'Export audit reports'],
      ['system.configure', 'system', 'configure', 'Configure system settings'],
      ['system.maintain', 'system', 'maintain', 'System maintenance'],
      ['system.backup', 'system', 'backup', 'Backup system data'],
      ['admin.create', 'admin', 'create', 'Create admin accounts'],
      ['admin.read', 'admin', 'read', 'View admin information'],
      ['admin.update', 'admin', 'update', 'Modify admin accounts'],
      ['admin.delete', 'admin', 'delete', 'Delete admin accounts'],
      ['support.create', 'support', 'create', 'Create support records'],
      ['support.read', 'support', 'read', 'View support history'],
      ['support.update', 'support', 'update', 'Update support records']
    ]

    for (const [permName, resource, action, description] of permissions) {
      await client.query(`
        INSERT INTO admin_permissions (permission_name, resource, action, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (permission_name) DO NOTHING
      `, [permName, resource, action, description])
    }

    // Assign super admin role to existing admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@echosofme.com'
    await client.query(`
      UPDATE users 
      SET admin_role_id = (SELECT id FROM admin_roles WHERE role_name = 'super_admin'),
          is_admin = true,
          primary_role = 'admin'
      WHERE email = $1
    `, [adminEmail])

    console.log('Comprehensive admin portal tables created successfully!')
    
  } catch (error) {
    console.error('Error creating comprehensive admin tables:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run the function
createComprehensiveAdminTables()
  .then(() => {
    console.log('Comprehensive admin database setup completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('Comprehensive admin database setup failed:', error)
    process.exit(1)
  })