import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Get system settings from database
    const result = await query(`
      SELECT setting_key, setting_value, setting_type, description, updated_at 
      FROM system_settings 
      ORDER BY setting_key
    `)

    // Convert flat settings to nested structure
    const settings = result.rows.reduce((acc, row) => {
      const keys = row.setting_key.split('.')
      let current = acc
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      // Parse value based on type
      let value = row.setting_value
      switch (row.setting_type) {
        case 'boolean':
          value = value === 'true'
          break
        case 'number':
          value = parseFloat(value)
          break
        case 'json':
          value = JSON.parse(value)
          break
      }
      
      current[keys[keys.length - 1]] = value
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
})

export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const { settings } = await request.json()

    // Flatten settings object for database storage
    const flattenSettings = (obj: any, prefix = '') => {
      const flattened: Array<{key: string, value: any, type: string}> = []
      
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flattened.push(...flattenSettings(value, fullKey))
        } else {
          const type = Array.isArray(value) ? 'json' : 
                      typeof value === 'boolean' ? 'boolean' :
                      typeof value === 'number' ? 'number' : 'string'
          
          flattened.push({
            key: fullKey,
            value: type === 'json' ? JSON.stringify(value) : String(value),
            type
          })
        }
      }
      
      return flattened
    }

    const flattenedSettings = flattenSettings(settings)
    
    // Update settings in database
    await query('BEGIN')
    
    try {
      for (const setting of flattenedSettings) {
        await query(`
          INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (setting_key) 
          DO UPDATE SET 
            setting_value = EXCLUDED.setting_value,
            setting_type = EXCLUDED.setting_type,
            updated_at = CURRENT_TIMESTAMP
        `, [setting.key, setting.value, setting.type])
      }
      
      await query('COMMIT')
      
      // Log admin action
      await query(`
        INSERT INTO admin_audit_log (admin_email, action, resource, details, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [
        request.headers.get('admin-email'),
        'UPDATE_SETTINGS',
        'system_settings',
        JSON.stringify({ updated_keys: flattenedSettings.map(s => s.key) })
      ])

      return NextResponse.json({
        success: true,
        message: 'Settings updated successfully'
      })

    } catch (error) {
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
})