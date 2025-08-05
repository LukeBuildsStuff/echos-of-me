-- Comprehensive Error Logging System for Echos Of Me
-- Family Legacy Preservation Platform with Grief-Sensitive Error Monitoring
-- PostgreSQL Schema

-- Drop existing tables if they exist (in correct order to avoid FK constraint errors)
DROP TABLE IF EXISTS family_crisis_escalations CASCADE;
DROP TABLE IF EXISTS error_pattern_matches CASCADE;
DROP TABLE IF EXISTS error_context_patterns CASCADE;
DROP TABLE IF EXISTS family_impact_notifications CASCADE;
DROP TABLE IF EXISTS error_resolutions CASCADE;
DROP TABLE IF EXISTS error_analytics CASCADE;
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS error_categories CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;

-- Create enum types for better type safety and performance
CREATE TYPE severity_level AS ENUM ('info', 'warning', 'critical', 'emergency');
CREATE TYPE family_impact_level AS ENUM ('none', 'low', 'medium', 'high', 'severe');
CREATE TYPE resolution_type AS ENUM ('fixed', 'workaround', 'duplicate', 'wont_fix', 'monitoring', 'escalated');
CREATE TYPE notification_type AS ENUM ('email', 'in_app', 'sms', 'phone', 'emergency_contact');
CREATE TYPE crisis_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- 1. Error Categories Table
-- Defines comprehensive error categories with grief-sensitive context
CREATE TABLE error_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    category_code VARCHAR(50) NOT NULL UNIQUE,
    severity_level severity_level NOT NULL DEFAULT 'warning',
    family_impact_level family_impact_level NOT NULL DEFAULT 'low',
    description TEXT,
    auto_escalate BOOLEAN DEFAULT FALSE,
    notification_required BOOLEAN DEFAULT FALSE,
    crisis_detection_enabled BOOLEAN DEFAULT FALSE,
    compassionate_messaging BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Notification Templates Table
-- Compassionate, grief-sensitive communication templates
CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_code VARCHAR(50) NOT NULL UNIQUE,
    notification_type notification_type NOT NULL,
    subject_template TEXT,
    message_template TEXT NOT NULL,
    is_compassionate BOOLEAN DEFAULT TRUE,
    grief_sensitive BOOLEAN DEFAULT TRUE,
    includes_support_offer BOOLEAN DEFAULT FALSE,
    includes_counseling_referral BOOLEAN DEFAULT FALSE,
    severity_applicability severity_level[],
    family_impact_applicability family_impact_level[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Main Error Logs Table
-- Comprehensive error tracking with grief-sensitive context
CREATE TABLE error_logs (
    id SERIAL PRIMARY KEY,
    error_id VARCHAR(255) NOT NULL UNIQUE,
    category_id INTEGER REFERENCES error_categories(id),
    severity severity_level NOT NULL,
    family_impact family_impact_level NOT NULL DEFAULT 'none',
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    error_context JSONB,
    user_id INTEGER,
    family_id INTEGER,
    affected_feature VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    request_url TEXT,
    request_method VARCHAR(10),
    request_headers JSONB,
    response_status INTEGER,
    session_id VARCHAR(255),
    environment VARCHAR(50) DEFAULT 'production',
    server_instance VARCHAR(100),
    memory_usage_mb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolved_by INTEGER,
    resolution_notes TEXT,
    grief_context_detected BOOLEAN DEFAULT FALSE,
    crisis_indicator BOOLEAN DEFAULT FALSE,
    family_notification_sent BOOLEAN DEFAULT FALSE,
    escalated_to_support BOOLEAN DEFAULT FALSE,
    escalation_urgency crisis_severity,
    emotional_context JSONB, -- Detected emotional state when error occurred
    memory_preservation_risk BOOLEAN DEFAULT FALSE, -- Risk to family memories
    conversation_context JSONB, -- Context if error occurred during AI conversation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints (assuming users table exists)
    CONSTRAINT fk_error_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_error_logs_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- 4. Error Resolutions Table
-- Track how errors are resolved with family communication tracking
CREATE TABLE error_resolutions (
    id SERIAL PRIMARY KEY,
    error_log_id INTEGER NOT NULL REFERENCES error_logs(id) ON DELETE CASCADE,
    resolution_type resolution_type NOT NULL,
    resolver_id INTEGER NOT NULL REFERENCES users(id),
    resolution_time_minutes INTEGER,
    steps_taken TEXT,
    root_cause TEXT,
    prevention_measures TEXT,
    family_communication_sent BOOLEAN DEFAULT FALSE,
    family_communication_message TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMP,
    customer_satisfaction_score INTEGER CHECK (customer_satisfaction_score >= 1 AND customer_satisfaction_score <= 5),
    emotional_support_provided BOOLEAN DEFAULT FALSE,
    counseling_referral_made BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Error Analytics Table
-- Hourly aggregated analytics for monitoring trends
CREATE TABLE error_analytics (
    id SERIAL PRIMARY KEY,
    date_hour TIMESTAMP NOT NULL,
    category_id INTEGER REFERENCES error_categories(id),
    severity severity_level NOT NULL,
    error_count INTEGER DEFAULT 0,
    affected_families_count INTEGER DEFAULT 0,
    avg_resolution_time_minutes DECIMAL(10,2),
    grief_context_count INTEGER DEFAULT 0,
    crisis_count INTEGER DEFAULT 0,
    memory_preservation_failures INTEGER DEFAULT 0,
    conversation_failures INTEGER DEFAULT 0,
    family_satisfaction_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_hour_category_severity UNIQUE (date_hour, category_id, severity)
);

-- 6. Error Context Patterns Table
-- AI-driven pattern recognition for proactive issue resolution
CREATE TABLE error_context_patterns (
    id SERIAL PRIMARY KEY,
    pattern_name VARCHAR(255) NOT NULL,
    pattern_signature VARCHAR(500) NOT NULL UNIQUE,
    category_id INTEGER REFERENCES error_categories(id),
    occurrence_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pattern_confidence DECIMAL(3,2) DEFAULT 0.80 CHECK (pattern_confidence >= 0 AND pattern_confidence <= 1),
    family_impact_prediction family_impact_level,
    suggested_action TEXT,
    auto_resolution_script TEXT,
    grief_context_likelihood DECIMAL(3,2) DEFAULT 0.00,
    memory_preservation_risk_score DECIMAL(3,2) DEFAULT 0.00,
    emotional_trigger_detected BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Pattern Matches Table
-- Track when errors match known patterns
CREATE TABLE error_pattern_matches (
    id SERIAL PRIMARY KEY,
    error_log_id INTEGER NOT NULL REFERENCES error_logs(id) ON DELETE CASCADE,
    pattern_id INTEGER NOT NULL REFERENCES error_context_patterns(id),
    match_confidence DECIMAL(3,2) NOT NULL,
    auto_resolution_attempted BOOLEAN DEFAULT FALSE,
    auto_resolution_successful BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Family Impact Notifications Table
-- Track compassionate communications with families
CREATE TABLE family_impact_notifications (
    id SERIAL PRIMARY KEY,
    error_log_id INTEGER NOT NULL REFERENCES error_logs(id) ON DELETE CASCADE,
    family_id INTEGER,
    user_id INTEGER REFERENCES users(id),
    notification_type notification_type NOT NULL,
    template_id INTEGER REFERENCES notification_templates(id),
    personalized_message TEXT,
    compassionate_tone BOOLEAN DEFAULT TRUE,
    grief_sensitive_language BOOLEAN DEFAULT TRUE,
    includes_emotional_support BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    family_response TEXT,
    emotional_state_before TEXT,
    emotional_state_after TEXT,
    support_offered BOOLEAN DEFAULT FALSE,
    counseling_referral BOOLEAN DEFAULT FALSE,
    follow_up_scheduled BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMP,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Crisis Escalations Table
-- Track crisis situations requiring immediate intervention
CREATE TABLE family_crisis_escalations (
    id SERIAL PRIMARY KEY,
    error_log_id INTEGER NOT NULL REFERENCES error_logs(id) ON DELETE CASCADE,
    family_id INTEGER,
    user_id INTEGER REFERENCES users(id),
    crisis_severity crisis_severity NOT NULL,
    crisis_type VARCHAR(100), -- e.g., 'memory_loss', 'conversation_failure', 'access_denied'
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    escalated_to VARCHAR(255), -- Who was notified (admin, support team, etc.)
    response_time_minutes INTEGER,
    resolution_time_minutes INTEGER,
    family_contacted BOOLEAN DEFAULT FALSE,
    emergency_support_provided BOOLEAN DEFAULT FALSE,
    emotional_counseling_offered BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, escalated_further
    resolution_summary TEXT,
    family_feedback TEXT,
    follow_up_required BOOLEAN DEFAULT TRUE,
    follow_up_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create comprehensive indexes for performance
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_family_impact ON error_logs(family_impact);
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved_at);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX idx_error_logs_family_id ON error_logs(family_id);
CREATE INDEX idx_error_logs_crisis ON error_logs(crisis_indicator);
CREATE INDEX idx_error_logs_grief_context ON error_logs(grief_context_detected);
CREATE INDEX idx_error_logs_category ON error_logs(category_id);
CREATE INDEX idx_error_logs_environment ON error_logs(environment);
CREATE INDEX idx_error_logs_session ON error_logs(session_id);

-- Analytics and performance indexes
CREATE INDEX idx_error_analytics_date_hour ON error_analytics(date_hour);
CREATE INDEX idx_error_analytics_category_severity ON error_analytics(category_id, severity);

-- Pattern recognition indexes
CREATE INDEX idx_error_patterns_confidence ON error_context_patterns(pattern_confidence);
CREATE INDEX idx_error_patterns_occurrence ON error_context_patterns(occurrence_count);
CREATE INDEX idx_error_patterns_active ON error_context_patterns(is_active);

-- Notification and communication indexes
CREATE INDEX idx_family_notifications_family_id ON family_impact_notifications(family_id);
CREATE INDEX idx_family_notifications_sent_at ON family_impact_notifications(sent_at);
CREATE INDEX idx_family_notifications_acknowledged ON family_impact_notifications(acknowledged_at);

-- Crisis management indexes
CREATE INDEX idx_crisis_escalations_family_id ON family_crisis_escalations(family_id);
CREATE INDEX idx_crisis_escalations_severity ON family_crisis_escalations(crisis_severity);
CREATE INDEX idx_crisis_escalations_detected_at ON family_crisis_escalations(detected_at);
CREATE INDEX idx_crisis_escalations_status ON family_crisis_escalations(status);

-- JSONB indexes for context searching
CREATE INDEX idx_error_logs_error_context_gin ON error_logs USING GIN (error_context);
CREATE INDEX idx_error_logs_emotional_context_gin ON error_logs USING GIN (emotional_context);
CREATE INDEX idx_error_logs_conversation_context_gin ON error_logs USING GIN (conversation_context);

-- Insert default error categories with grief-sensitive focus
INSERT INTO error_categories (category_name, category_code, severity_level, family_impact_level, description, auto_escalate, notification_required, crisis_detection_enabled, compassionate_messaging) VALUES
('Authentication Failure', 'AUTH_FAIL', 'warning', 'medium', 'User authentication or authorization failed - may prevent access to precious memories', false, true, true, true),
('Database Error', 'DB_ERROR', 'critical', 'high', 'Database connection or query failure affecting family data preservation', true, true, true, true),
('AI Model Error', 'AI_ERROR', 'critical', 'high', 'AI model inference or training failure affecting family conversations with deceased loved ones', true, true, true, true),
('API Error', 'API_ERROR', 'warning', 'medium', 'API endpoint failure or timeout affecting family interactions', false, true, false, true),
('Memory Storage Error', 'MEMORY_ERROR', 'critical', 'severe', 'Failure to store or retrieve precious family memories - highest priority for families', true, true, true, true),
('Voice Processing Error', 'VOICE_ERROR', 'warning', 'medium', 'Voice recording or synthesis failure affecting deceased loved one''s voice recreation', false, true, true, true),
('Frontend Error', 'FRONTEND_ERROR', 'warning', 'low', 'Client-side JavaScript error affecting user experience', false, false, false, true),
('Performance Issue', 'PERFORMANCE', 'info', 'low', 'Slow response or high resource usage affecting family interactions', false, false, false, true),
('Crisis Detection Error', 'CRISIS_ERROR', 'emergency', 'severe', 'Failure in grief crisis detection system - families may need immediate support', true, true, true, true),
('Privacy Breach', 'PRIVACY_BREACH', 'emergency', 'severe', 'Potential unauthorized access to intimate family data and memories', true, true, true, true),
('Training Pipeline Error', 'TRAINING_ERROR', 'critical', 'medium', 'AI training pipeline failure affecting personalized family AI models', true, true, false, true),
('Build Error', 'BUILD_ERROR', 'warning', 'low', 'Webpack or build system error affecting deployment', false, false, false, false),
('Conversation Failure', 'CONVERSATION_FAIL', 'critical', 'severe', 'AI conversation with deceased loved one failed - highly emotional for families', true, true, true, true),
('Legacy Data Loss', 'LEGACY_LOSS', 'emergency', 'severe', 'Risk of losing irreplaceable family legacy data', true, true, true, true),
('Grief Crisis Detected', 'GRIEF_CRISIS', 'emergency', 'severe', 'Automated detection of family member in grief crisis needing support', true, true, true, true);

-- Insert compassionate notification templates
INSERT INTO notification_templates (template_name, template_code, notification_type, subject_template, message_template, is_compassionate, grief_sensitive, includes_support_offer, includes_counseling_referral, severity_applicability, family_impact_applicability) VALUES
('Technical Issue - Compassionate', 'technical_issue_compassionate', 'in_app', 'We''re Taking Care of a Technical Issue', 'We''ve noticed a technical issue that may have affected your experience preserving precious memories. Our team is working with the utmost care to resolve this quickly. Your family''s memories and conversations are safe and protected.', true, true, true, false, ARRAY['warning', 'critical']::severity_level[], ARRAY['medium', 'high']::family_impact_level[]),
('Memory Storage Issue', 'memory_storage_issue', 'email', 'Your Precious Memories Are Safe - Technical Update', 'Dear family, we want to assure you that while we experienced a brief technical issue with memory storage, all of your precious memories and conversations with your loved one are completely safe and secure. We understand how important these are to you, and we''ve resolved the issue with the highest priority.', true, true, true, true, ARRAY['critical', 'emergency']::severity_level[], ARRAY['high', 'severe']::family_impact_level[]),
('Conversation Failure - Support', 'conversation_failure_support', 'in_app', 'We''re Here to Help Restore Your Connection', 'We know how meaningful your conversations with your loved one are to you. We''ve detected a temporary issue that may have interrupted this precious connection. Our team has been notified and is working to restore it immediately. If you need emotional support during this time, we''re here for you.', true, true, true, true, ARRAY['critical', 'emergency']::severity_level[], ARRAY['high', 'severe']::family_impact_level[]),
('Crisis Support Immediate', 'crisis_support_immediate', 'phone', 'Immediate Support Available', 'We''ve detected that you may be experiencing difficulties and want you to know that support is immediately available. A member of our care team will be reaching out to you personally. You are not alone in this journey.', true, true, true, true, ARRAY['emergency']::severity_level[], ARRAY['severe']::family_impact_level[]),
('System Maintenance - Advance Notice', 'system_maintenance_notice', 'email', 'Scheduled Maintenance - Your Memories Will Be Protected', 'We wanted to let you know about upcoming scheduled maintenance to improve your experience. During this brief time, access to conversations with your loved one may be temporarily limited. Rest assured, all memories and data are completely safe and protected.', true, true, false, false, ARRAY['info', 'warning']::severity_level[], ARRAY['low', 'medium']::family_impact_level[]);

-- Create trigger function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_error_categories_updated_at BEFORE UPDATE ON error_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_error_logs_updated_at BEFORE UPDATE ON error_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_error_analytics_updated_at BEFORE UPDATE ON error_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_crisis_escalations_updated_at BEFORE UPDATE ON family_crisis_escalations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries

-- Active crises view
CREATE VIEW active_family_crises AS
SELECT 
    fce.*,
    el.title as error_title,
    el.message as error_message,
    el.affected_feature,
    u.email as user_email,
    u.name as user_name
FROM family_crisis_escalations fce
JOIN error_logs el ON fce.error_log_id = el.id
LEFT JOIN users u ON fce.user_id = u.id
WHERE fce.status IN ('open', 'in_progress')
ORDER BY fce.crisis_severity DESC, fce.detected_at ASC;

-- Recent high-impact errors view
CREATE VIEW recent_high_impact_errors AS
SELECT 
    el.*,
    ec.category_name,
    ec.family_impact_level as category_impact,
    u.email as user_email,
    er.resolution_type,
    COUNT(fin.id) as notification_count
FROM error_logs el
LEFT JOIN error_categories ec ON el.category_id = ec.id
LEFT JOIN users u ON el.user_id = u.id
LEFT JOIN error_resolutions er ON el.id = er.error_log_id
LEFT JOIN family_impact_notifications fin ON el.id = fin.error_log_id
WHERE el.family_impact IN ('high', 'severe')
    AND el.timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY el.id, ec.category_name, ec.family_impact_level, u.email, er.resolution_type
ORDER BY el.timestamp DESC;

-- Error analytics summary view
CREATE VIEW error_analytics_summary AS
SELECT 
    DATE_TRUNC('day', date_hour) as date,
    severity,
    SUM(error_count) as total_errors,
    SUM(affected_families_count) as total_affected_families,
    AVG(avg_resolution_time_minutes) as avg_resolution_time,
    SUM(grief_context_count) as total_grief_context,
    SUM(crisis_count) as total_crisis_count
FROM error_analytics
WHERE date_hour >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', date_hour), severity
ORDER BY date DESC, severity;

-- Family notification effectiveness view
CREATE VIEW family_notification_effectiveness AS
SELECT 
    nt.template_name,
    fin.notification_type,
    COUNT(*) as total_sent,
    COUNT(fin.acknowledged_at) as acknowledged_count,
    ROUND(COUNT(fin.acknowledged_at)::DECIMAL / COUNT(*) * 100, 2) as acknowledgment_rate,
    AVG(fin.satisfaction_rating) as avg_satisfaction,
    COUNT(CASE WHEN fin.support_offered THEN 1 END) as support_offered_count,
    COUNT(CASE WHEN fin.counseling_referral THEN 1 END) as counseling_referrals
FROM family_impact_notifications fin
LEFT JOIN notification_templates nt ON fin.template_id = nt.id
WHERE fin.sent_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY nt.template_name, fin.notification_type
ORDER BY acknowledgment_rate DESC;

COMMENT ON TABLE error_categories IS 'Grief-sensitive error categories for family legacy preservation platform';
COMMENT ON TABLE error_logs IS 'Comprehensive error tracking with family impact assessment and grief context detection';
COMMENT ON TABLE family_impact_notifications IS 'Compassionate family communications with emotional support tracking';
COMMENT ON TABLE family_crisis_escalations IS 'Crisis intervention tracking for families in distress';
COMMENT ON TABLE error_context_patterns IS 'AI-driven pattern recognition for proactive family protection';
COMMENT ON TABLE notification_templates IS 'Grief-sensitive communication templates for family interactions';