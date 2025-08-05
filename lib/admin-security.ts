import { query } from './db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Admin role permissions mapping
export type AdminPermission = 
  | 'users.create' | 'users.read' | 'users.update' | 'users.delete' | 'users.shadow'
  | 'families.create' | 'families.read' | 'families.update' | 'families.delete' | 'families.manage' | 'families.support'
  | 'crisis.read' | 'crisis.respond' | 'crisis.escalate'
  | 'privacy.read' | 'privacy.process' | 'privacy.approve' | 'privacy.delete'
  | 'analytics.read' | 'analytics.export'
  | 'audit.read' | 'audit.export'
  | 'system.configure' | 'system.maintain' | 'system.backup'
  | 'admin.create' | 'admin.read' | 'admin.update' | 'admin.delete'
  | 'support.create' | 'support.read' | 'support.update'

export interface AdminUser {
  id: string
  email: string
  name: string
  is_admin: boolean
  admin_role_id: string | null
  role_name: string | null
  permissions: Record<string, string[]>
}

export interface AuditLogEntry {
  admin_user_id?: string
  admin_email: string
  action_type: string
  resource_type: string
  resource_id?: string
  target_user_id?: string
  target_family_id?: string
  action_details?: any
  before_state?: any
  after_state?: any
  ip_address?: string
  user_agent?: string
  session_id?: string
  risk_level?: 'low' | 'medium' | 'high' | 'critical'
  compliance_relevant?: boolean
}

// Check if user is admin with specific permission
export async function verifyAdminPermission(
  email: string, 
  permission: AdminPermission
): Promise<{ isAuthorized: boolean; user?: AdminUser; error?: string }> {
  try {
    const result = await query(`
      SELECT 
        u.id, u.email, u.name, u.is_admin, u.admin_role_id,
        ar.role_name, ar.permissions
      FROM users u
      LEFT JOIN admin_roles ar ON u.admin_role_id = ar.id
      WHERE u.email = $1 AND u.is_admin = true AND u.is_active = true
    `, [email])

    if (result.rows.length === 0) {
      return { isAuthorized: false, error: 'User not found or not an admin' }
    }

    const user = result.rows[0] as AdminUser
    
    if (!user.admin_role_id || !user.permissions) {
      return { isAuthorized: false, error: 'Admin role not properly configured' }
    }

    // Check if user has the specific permission
    const [resource, action] = permission.split('.')
    const hasPermission = user.permissions[resource]?.includes(action)

    if (!hasPermission) {
      return { 
        isAuthorized: false, 
        user, 
        error: `Insufficient permissions for ${permission}` 
      }
    }

    return { isAuthorized: true, user }
  } catch (error) {
    console.error('Error verifying admin permission:', error)
    return { isAuthorized: false, error: 'Database error' }
  }
}

// Verify session and admin permissions
export async function verifyAdminSession(
  permission: AdminPermission,
  request?: Request
): Promise<{ isAuthorized: boolean; user?: AdminUser; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return { isAuthorized: false, error: 'No valid session' }
    }

    const result = await verifyAdminPermission(session.user.email, permission)
    
    // Log access attempt for audit
    if (request) {
      await logAdminAction({
        admin_email: session.user.email,
        action_type: 'permission_check',
        resource_type: 'admin_access',
        action_details: { permission, granted: result.isAuthorized },
        ip_address: getClientIP(request),
        user_agent: request.headers.get('user-agent') || undefined,
        risk_level: result.isAuthorized ? 'low' : 'medium'
      })
    }

    return result
  } catch (error) {
    console.error('Error verifying admin session:', error)
    return { isAuthorized: false, error: 'Session verification failed' }
  }
}

// Log admin actions for audit trail
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    // Check if audit table exists before trying to log
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'comprehensive_audit_log'
      )
    `)
    
    if (!tableExists.rows[0].exists) {
      console.log('Audit table not found, skipping log entry:', entry.action_type)
      return
    }

    await query(`
      INSERT INTO comprehensive_audit_log (
        admin_user_id, admin_email, action_type, resource_type, resource_id,
        target_user_id, target_family_id, action_details, before_state, after_state,
        ip_address, user_agent, session_id, risk_level, compliance_relevant,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
    `, [
      entry.admin_user_id || null,
      entry.admin_email,
      entry.action_type,
      entry.resource_type,
      entry.resource_id || null,
      entry.target_user_id || null,
      entry.target_family_id || null,
      entry.action_details ? JSON.stringify(entry.action_details) : null,
      entry.before_state ? JSON.stringify(entry.before_state) : null,
      entry.after_state ? JSON.stringify(entry.after_state) : null,
      entry.ip_address || null,
      entry.user_agent || null,
      entry.session_id || null,
      entry.risk_level || 'low',
      entry.compliance_relevant || false
    ])
  } catch (error) {
    console.error('Error logging admin action:', error)
    // Don't throw here to avoid breaking the main operation
  }
}

// Generate secure shadow session token
export async function createShadowSession(
  adminUserId: string,
  targetUserId: string,
  reason: string,
  privacyLevel: 'read_only' | 'limited_interaction' | 'full_support' = 'read_only'
): Promise<{ token: string; sessionId: string }> {
  const token = crypto.randomBytes(32).toString('hex')
  const sessionId = crypto.randomUUID()

  await query(`
    INSERT INTO user_shadowing_sessions (
      id, admin_user_id, target_user_id, session_token, shadow_reason, 
      privacy_level, session_started_at, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, true)
  `, [sessionId, adminUserId, targetUserId, token, reason, privacyLevel])

  return { token, sessionId }
}

// Validate shadow session
export async function validateShadowSession(token: string): Promise<{
  isValid: boolean
  session?: any
  error?: string
}> {
  try {
    const result = await query(`
      SELECT 
        uss.*, 
        admin_user.email as admin_email,
        target_user.email as target_email,
        target_user.name as target_name
      FROM user_shadowing_sessions uss
      JOIN users admin_user ON uss.admin_user_id = admin_user.id
      JOIN users target_user ON uss.target_user_id = target_user.id
      WHERE uss.session_token = $1 AND uss.is_active = true
        AND uss.session_started_at > NOW() - INTERVAL '24 hours'
    `, [token])

    if (result.rows.length === 0) {
      return { isValid: false, error: 'Invalid or expired shadow session' }
    }

    return { isValid: true, session: result.rows[0] }
  } catch (error) {
    console.error('Error validating shadow session:', error)
    return { isValid: false, error: 'Session validation failed' }
  }
}

// End shadow session
export async function endShadowSession(sessionId: string, adminNotes?: string): Promise<void> {
  await query(`
    UPDATE user_shadowing_sessions 
    SET is_active = false, session_ended_at = CURRENT_TIMESTAMP, session_notes = $2
    WHERE id = $1
  `, [sessionId, adminNotes || null])
}

// Record shadow session action
export async function recordShadowAction(
  sessionId: string,
  action: string,
  details: any,
  sensitiveDataAccessed: boolean = false
): Promise<void> {
  await query(`
    UPDATE user_shadowing_sessions 
    SET 
      actions_performed = actions_performed || $2::jsonb,
      sensitive_data_accessed = sensitive_data_accessed OR $3
    WHERE id = $1
  `, [sessionId, JSON.stringify([{ action, details, timestamp: new Date().toISOString() }]), sensitiveDataAccessed])
}

// Grief-sensitive error messages
export function getGriefSensitiveErrorMessage(error: string): string {
  const sensitiveMessages: Record<string, string> = {
    'insufficient_permissions': 'We understand this is important to you. Please contact our support team who can help with your request.',
    'user_not_found': 'We cannot locate the requested information. Our team is here to help you find what you need.',
    'family_not_found': 'This family information is not available. Please reach out if you need assistance.',
    'crisis_detected': 'We notice you may need some support right now. A caring team member will reach out to you soon.',
    'data_processing_error': 'There was a temporary issue processing your request. Please try again or contact our support team.',
    'unauthorized_access': 'For privacy and security, access to this information is restricted. Our team can help if you need assistance.',
    'session_expired': 'Your session has ended. Please sign in again to continue.',
    'rate_limited': 'Please take a moment before trying again. Our team is here if you need immediate assistance.'
  }

  return sensitiveMessages[error] || 'Something went wrong, but our caring team is here to help. Please contact support.'
}

// Hash password for admin users
export async function hashAdminPassword(password: string): Promise<string> {
  const saltRounds = 12 // Higher security for admin accounts
  return await bcrypt.hash(password, saltRounds)
}

// Verify admin password
export async function verifyAdminPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

// Get client IP address from request
export function getClientIP(request: Request): string | null {
  // Check various headers for client IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // Take the first IP if there are multiple
      return value.split(',')[0].trim()
    }
  }

  return null
}

// Check if IP is blocked
export async function isIPBlocked(ip: string): Promise<boolean> {
  if (!ip) return false
  
  try {
    const result = await query(`
      SELECT id FROM blocked_ips 
      WHERE ip_address = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `, [ip])
    
    return result.rows.length > 0
  } catch (error) {
    console.error('Error checking blocked IP:', error)
    return false
  }
}

// Crisis detection helper
export async function detectCrisisInContent(
  userId: string,
  content: string,
  familyId?: string
): Promise<{ needsIntervention: boolean; severity: number; suggestions: string[] }> {
  // Simple keyword-based crisis detection (in production, use AI/ML)
  const crisisKeywords = [
    'suicide', 'kill myself', 'end it all', 'can\'t go on', 'hopeless',
    'worthless', 'burden', 'better off dead', 'nobody cares', 'give up'
  ]
  
  const griefKeywords = [
    'overwhelming', 'can\'t cope', 'intense pain', 'unbearable',
    'alone', 'empty', 'devastated', 'lost', 'abandoned'
  ]

  const lowerContent = content.toLowerCase()
  const crisisMatches = crisisKeywords.filter(keyword => lowerContent.includes(keyword))
  const griefMatches = griefKeywords.filter(keyword => lowerContent.includes(keyword))
  
  let severity = 1
  let needsIntervention = false
  const suggestions: string[] = []

  if (crisisMatches.length > 0) {
    severity = Math.min(10, 7 + crisisMatches.length)
    needsIntervention = true
    suggestions.push('Immediate crisis intervention required')
    suggestions.push('Contact emergency services if imminent danger')
    suggestions.push('Provide crisis hotline numbers')
  } else if (griefMatches.length > 2) {
    severity = Math.min(6, 3 + griefMatches.length)
    needsIntervention = true
    suggestions.push('Emotional support needed')
    suggestions.push('Consider grief counseling resources')
    suggestions.push('Schedule follow-up check-in')
  }

  // Log the detection event
  if (needsIntervention) {
    await query(`
      INSERT INTO crisis_detection_events (
        user_id, family_id, event_type, severity_level, trigger_content,
        keywords_detected, response_suggestion, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', CURRENT_TIMESTAMP)
    `, [
      userId,
      familyId || null,
      'keyword_detection',
      severity,
      content.substring(0, 500), // Limit stored content
      [...crisisMatches, ...griefMatches],
      suggestions.join('; ')
    ])
  }

  return { needsIntervention, severity, suggestions }
}

// Privacy compliance helpers
export async function processPrivacyRequest(
  requestId: string,
  adminEmail: string,
  status: 'completed' | 'rejected' | 'partially_completed',
  statusReason?: string,
  dataExportedPath?: string
): Promise<void> {
  await query(`
    UPDATE privacy_requests 
    SET 
      status = $2,
      status_reason = $3,
      processing_admin_email = $4,
      completed_at = CURRENT_TIMESTAMP,
      data_exported_path = $5
    WHERE id = $1
  `, [requestId, status, statusReason || null, adminEmail, dataExportedPath || null])

  // Log the privacy action
  await logAdminAction({
    admin_email: adminEmail,
    action_type: 'privacy_request_processed',
    resource_type: 'privacy_request',
    resource_id: requestId,
    action_details: { status, statusReason, dataExportedPath },
    risk_level: 'medium',
    compliance_relevant: true
  })
}