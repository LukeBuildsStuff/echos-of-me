/**
 * Privacy Controls and Consent Management for Admin-Initiated Training
 * 
 * Comprehensive privacy framework ensuring user consent and data protection
 * while enabling admin oversight and training capabilities
 */

import { query } from './db'

export interface ConsentRecord {
  id: string
  userId: string
  consentType: 'training' | 'data_access' | 'model_sharing' | 'analytics'
  status: 'granted' | 'denied' | 'pending' | 'revoked'
  grantedAt: Date | null
  revokedAt: Date | null
  expiresAt: Date | null
  metadata: {
    ipAddress?: string
    userAgent?: string
    adminUserId?: string
    reason?: string
    scope: string[]
  }
}

export interface PrivacySettings {
  userId: string
  allowAdminTraining: boolean
  allowDataPreview: boolean
  allowModelSharing: boolean
  requireExplicitConsent: boolean
  dataRetentionPeriod: number // days
  lastUpdated: Date
  notificationPreferences: {
    trainingStarted: boolean
    trainingCompleted: boolean
    dataAccessed: boolean
    modelDeployed: boolean
  }
}

export interface DataAccessAudit {
  id: string
  userId: string // user whose data was accessed
  adminUserId: string // admin who accessed the data
  accessType: 'preview' | 'training' | 'model_interaction' | 'analytics'
  dataTypes: string[] // ['responses', 'life_entries', 'milestones']
  accessReason: string
  accessedAt: Date
  ipAddress: string
  userAgent: string
  recordCount: number
  approved: boolean
  approvalReason?: string
}

export class PrivacyManager {
  /**
   * Initialize privacy settings for a user
   */
  async initializePrivacySettings(userId: string): Promise<PrivacySettings> {
    const defaultSettings: PrivacySettings = {
      userId,
      allowAdminTraining: false, // Opt-in by default
      allowDataPreview: false,
      allowModelSharing: false,
      requireExplicitConsent: true,
      dataRetentionPeriod: 365, // 1 year
      lastUpdated: new Date(),
      notificationPreferences: {
        trainingStarted: true,
        trainingCompleted: true,
        dataAccessed: true,
        modelDeployed: false
      }
    }

    await query(`
      INSERT INTO privacy_settings (
        user_id, allow_admin_training, allow_data_preview, allow_model_sharing,
        require_explicit_consent, data_retention_period, notification_preferences,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO NOTHING
    `, [
      userId,
      defaultSettings.allowAdminTraining,
      defaultSettings.allowDataPreview,
      defaultSettings.allowModelSharing,
      defaultSettings.requireExplicitConsent,
      defaultSettings.dataRetentionPeriod,
      JSON.stringify(defaultSettings.notificationPreferences)
    ])

    return defaultSettings
  }

  /**
   * Get user privacy settings
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    const result = await query(`
      SELECT * FROM privacy_settings WHERE user_id = $1
    `, [userId])

    if (result.rows.length === 0) {
      return await this.initializePrivacySettings(userId)
    }

    const row = result.rows[0]
    return {
      userId: row.user_id,
      allowAdminTraining: row.allow_admin_training,
      allowDataPreview: row.allow_data_preview,
      allowModelSharing: row.allow_model_sharing,
      requireExplicitConsent: row.require_explicit_consent,
      dataRetentionPeriod: row.data_retention_period,
      lastUpdated: row.updated_at,
      notificationPreferences: JSON.parse(row.notification_preferences || '{}')
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(userId: string, updates: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const allowedFields = [
      'allow_admin_training',
      'allow_data_preview', 
      'allow_model_sharing',
      'require_explicit_consent',
      'data_retention_period',
      'notification_preferences'
    ]

    const setClause = []
    const values = [userId]
    let paramCount = 1

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      if (allowedFields.includes(dbField)) {
        paramCount++
        setClause.push(`${dbField} = $${paramCount}`)
        values.push(typeof value === 'object' ? JSON.stringify(value) : value)
      }
    }

    if (setClause.length > 0) {
      await query(`
        UPDATE privacy_settings 
        SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `, values)
    }

    return await this.getPrivacySettings(userId) as PrivacySettings
  }

  /**
   * Request consent for specific action
   */
  async requestConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    adminUserId: string,
    scope: string[],
    reason?: string
  ): Promise<ConsentRecord> {
    const consentId = crypto.randomUUID()
    
    const consent: ConsentRecord = {
      id: consentId,
      userId,
      consentType,
      status: 'pending',
      grantedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      metadata: {
        adminUserId,
        reason,
        scope,
        ipAddress: 'admin_system',
        userAgent: 'admin_dashboard'
      }
    }

    await query(`
      INSERT INTO consent_records (
        id, user_id, consent_type, status, expires_at, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      consent.id,
      consent.userId,
      consent.consentType,
      consent.status,
      consent.expiresAt,
      JSON.stringify(consent.metadata)
    ])

    // Send notification to user
    await this.sendConsentNotification(userId, consent)

    return consent
  }

  /**
   * Grant consent (user action)
   */
  async grantConsent(consentId: string, userId: string): Promise<ConsentRecord> {
    const result = await query(`
      UPDATE consent_records 
      SET status = 'granted', granted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
      RETURNING *
    `, [consentId, userId])

    if (result.rows.length === 0) {
      throw new Error('Consent record not found or already processed')
    }

    const consent = this.parseConsentRecord(result.rows[0])
    
    // Notify admin of consent grant
    await this.notifyAdminOfConsentChange(consent, 'granted')

    return consent
  }

  /**
   * Revoke consent (user or admin action)
   */
  async revokeConsent(consentId: string, userId: string, reason?: string): Promise<ConsentRecord> {
    const result = await query(`
      UPDATE consent_records 
      SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
          metadata = metadata || $3
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [consentId, userId, JSON.stringify({ revocationReason: reason })])

    if (result.rows.length === 0) {
      throw new Error('Consent record not found')
    }

    const consent = this.parseConsentRecord(result.rows[0])
    
    // Stop any ongoing training if training consent is revoked
    if (consent.consentType === 'training') {
      await this.stopUserTraining(userId)
    }

    return consent
  }

  /**
   * Check if admin can access user data
   */
  async checkDataAccess(
    userId: string,
    adminUserId: string,
    accessType: DataAccessAudit['accessType'],
    dataTypes: string[]
  ): Promise<{ allowed: boolean; reason: string; requiresConsent: boolean }> {
    
    const privacySettings = await this.getPrivacySettings(userId)
    if (!privacySettings) {
      return { allowed: false, reason: 'Privacy settings not found', requiresConsent: true }
    }

    // Check specific permissions
    switch (accessType) {
      case 'preview':
        if (!privacySettings.allowDataPreview) {
          return { allowed: false, reason: 'Data preview not permitted', requiresConsent: true }
        }
        break
        
      case 'training':
        if (!privacySettings.allowAdminTraining) {
          return { allowed: false, reason: 'Admin training not permitted', requiresConsent: true }
        }
        break
        
      case 'model_interaction':
        if (!privacySettings.allowModelSharing) {
          return { allowed: false, reason: 'Model sharing not permitted', requiresConsent: true }
        }
        break
    }

    // Check for explicit consent if required
    if (privacySettings.requireExplicitConsent) {
      const hasValidConsent = await this.checkValidConsent(userId, accessType, dataTypes)
      if (!hasValidConsent) {
        return { allowed: false, reason: 'Explicit consent required', requiresConsent: true }
      }
    }

    // Check data retention period
    const dataAge = await this.checkDataAge(userId)
    if (dataAge > privacySettings.dataRetentionPeriod) {
      return { allowed: false, reason: 'Data retention period exceeded', requiresConsent: false }
    }

    return { allowed: true, reason: 'Access permitted', requiresConsent: false }
  }

  /**
   * Log data access for audit trail
   */
  async logDataAccess(
    userId: string,
    adminUserId: string,
    accessType: DataAccessAudit['accessType'],
    dataTypes: string[],
    accessReason: string,
    recordCount: number,
    ipAddress: string,
    userAgent: string,
    approved: boolean = true
  ): Promise<DataAccessAudit> {
    
    const auditId = crypto.randomUUID()
    
    const audit: DataAccessAudit = {
      id: auditId,
      userId,
      adminUserId,
      accessType,
      dataTypes,
      accessReason,
      accessedAt: new Date(),
      ipAddress,
      userAgent,
      recordCount,
      approved
    }

    await query(`
      INSERT INTO data_access_audit (
        id, user_id, admin_user_id, access_type, data_types, access_reason,
        accessed_at, ip_address, user_agent, record_count, approved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      audit.id,
      audit.userId,
      audit.adminUserId,
      audit.accessType,
      JSON.stringify(audit.dataTypes),
      audit.accessReason,
      audit.accessedAt,
      audit.ipAddress,
      audit.userAgent,
      audit.recordCount,
      audit.approved
    ])

    // Notify user if they have notifications enabled
    const privacySettings = await this.getPrivacySettings(userId)
    if (privacySettings?.notificationPreferences.dataAccessed) {
      await this.sendDataAccessNotification(userId, audit)
    }

    return audit
  }

  /**
   * Get audit trail for a user
   */
  async getAuditTrail(userId: string, limit: number = 50): Promise<DataAccessAudit[]> {
    const result = await query(`
      SELECT * FROM data_access_audit 
      WHERE user_id = $1 
      ORDER BY accessed_at DESC 
      LIMIT $2
    `, [userId, limit])

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      adminUserId: row.admin_user_id,
      accessType: row.access_type,
      dataTypes: JSON.parse(row.data_types || '[]'),
      accessReason: row.access_reason,
      accessedAt: row.accessed_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      recordCount: row.record_count,
      approved: row.approved
    }))
  }

  /**
   * Get all consent records for a user
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const result = await query(`
      SELECT * FROM consent_records 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId])

    return result.rows.map(row => this.parseConsentRecord(row))
  }

  /**
   * Bulk privacy check for multiple users
   */
  async bulkPrivacyCheck(
    userIds: string[],
    adminUserId: string,
    accessType: DataAccessAudit['accessType']
  ): Promise<Record<string, { allowed: boolean; reason: string }>> {
    
    const results: Record<string, { allowed: boolean; reason: string }> = {}
    
    for (const userId of userIds) {
      const check = await this.checkDataAccess(userId, adminUserId, accessType, ['responses', 'life_entries', 'milestones'])
      results[userId] = { allowed: check.allowed, reason: check.reason }
    }
    
    return results
  }

  /**
   * Generate privacy compliance report
   */
  async generateComplianceReport(adminUserId: string): Promise<{
    totalUsers: number
    consentStatus: Record<string, number>
    recentAccess: DataAccessAudit[]
    expiringConsents: ConsentRecord[]
    privacyViolations: any[]
  }> {
    
    const [totalUsers, consentStats, recentAccess, expiringConsents] = await Promise.all([
      query('SELECT COUNT(*) as total FROM users WHERE is_active = true'),
      query(`
        SELECT consent_type, status, COUNT(*) as count 
        FROM consent_records 
        GROUP BY consent_type, status
      `),
      query(`
        SELECT * FROM data_access_audit 
        WHERE accessed_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
        ORDER BY accessed_at DESC 
        LIMIT 100
      `),
      query(`
        SELECT * FROM consent_records 
        WHERE status = 'granted' 
        AND expires_at < CURRENT_TIMESTAMP + INTERVAL '30 days'
        ORDER BY expires_at ASC
      `)
    ])

    const consentStatus = consentStats.rows.reduce((acc, row) => {
      const key = `${row.consent_type}_${row.status}`
      acc[key] = parseInt(row.count)
      return acc
    }, {} as Record<string, number>)

    return {
      totalUsers: parseInt(totalUsers.rows[0].total),
      consentStatus,
      recentAccess: recentAccess.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        adminUserId: row.admin_user_id,
        accessType: row.access_type,
        dataTypes: JSON.parse(row.data_types || '[]'),
        accessReason: row.access_reason,
        accessedAt: row.accessed_at,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        recordCount: row.record_count,
        approved: row.approved
      })),
      expiringConsents: expiringConsents.rows.map(row => this.parseConsentRecord(row)),
      privacyViolations: [] // TODO: Implement violation detection
    }
  }

  // Helper methods
  private parseConsentRecord(row: any): ConsentRecord {
    return {
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type,
      status: row.status,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      expiresAt: row.expires_at,
      metadata: JSON.parse(row.metadata || '{}')
    }
  }

  private async checkValidConsent(userId: string, accessType: string, dataTypes: string[]): Promise<boolean> {
    const result = await query(`
      SELECT COUNT(*) as count FROM consent_records 
      WHERE user_id = $1 
      AND consent_type = $2 
      AND status = 'granted'
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `, [userId, accessType])

    return parseInt(result.rows[0].count) > 0
  }

  private async checkDataAge(userId: string): Promise<number> {
    const result = await query(`
      SELECT EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MIN(created_at))) as age_days
      FROM (
        SELECT created_at FROM responses WHERE user_id = $1
        UNION
        SELECT created_at FROM life_detail_entries WHERE user_id = $1
        UNION 
        SELECT created_at FROM milestone_messages WHERE user_id = $1
      ) as all_data
    `, [userId])

    return parseInt(result.rows[0]?.age_days || 0)
  }

  private async sendConsentNotification(userId: string, consent: ConsentRecord): Promise<void> {
    // TODO: Implement notification system
    console.log(`Consent notification sent to user ${userId} for ${consent.consentType}`)
  }

  private async notifyAdminOfConsentChange(consent: ConsentRecord, action: string): Promise<void> {
    // TODO: Implement admin notification
    console.log(`Admin notified: User ${consent.userId} ${action} consent for ${consent.consentType}`)
  }

  private async sendDataAccessNotification(userId: string, audit: DataAccessAudit): Promise<void> {
    // TODO: Implement notification system  
    console.log(`Data access notification sent to user ${userId} for ${audit.accessType}`)
  }

  private async stopUserTraining(userId: string): Promise<void> {
    // Stop any active training jobs for this user
    await query(`
      UPDATE training_runs 
      SET status = 'cancelled', 
          error_message = 'Training cancelled due to consent revocation',
          completed_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND status IN ('queued', 'running')
    `, [userId])

    console.log(`Stopped training for user ${userId} due to consent revocation`)
  }
}

// Database schema migration helper
export async function createPrivacyTables(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS privacy_settings (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      allow_admin_training BOOLEAN DEFAULT false,
      allow_data_preview BOOLEAN DEFAULT false,
      allow_model_sharing BOOLEAN DEFAULT false,
      require_explicit_consent BOOLEAN DEFAULT true,
      data_retention_period INTEGER DEFAULT 365,
      notification_preferences JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS consent_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      consent_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      granted_at TIMESTAMP WITH TIME ZONE,
      revoked_at TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS data_access_audit (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      access_type VARCHAR(50) NOT NULL,
      data_types JSONB NOT NULL,
      access_reason TEXT NOT NULL,
      accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45),
      user_agent TEXT,
      record_count INTEGER DEFAULT 0,
      approved BOOLEAN DEFAULT true
    )
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_consent_records_user_type 
    ON consent_records(user_id, consent_type, status)
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_data_access_audit_user_admin 
    ON data_access_audit(user_id, admin_user_id, accessed_at)
  `)
}

// Singleton instance
export const privacyManager = new PrivacyManager()