import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306')
}

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    const errorId = params.id
    const connection = await mysql.createConnection(dbConfig)
    
    try {
      // Get detailed error information
      const [errorRows] = await connection.execute(`
        SELECT 
          el.*,
          ec.category_name,
          ec.category_code,
          ec.description as category_description,
          ec.family_impact_level as category_family_impact,
          u.email as user_email,
          u.name as user_name,
          resolver.email as resolver_email,
          resolver.name as resolver_name
        FROM error_logs el
        LEFT JOIN error_categories ec ON el.category_id = ec.id
        LEFT JOIN users u ON el.user_id = u.id
        LEFT JOIN users resolver ON el.resolved_by = resolver.id
        WHERE el.id = ? OR el.error_id = ?
      `, [errorId, errorId])
      
      if ((errorRows as any).length === 0) {
        return NextResponse.json(
          { error: 'Error log not found' },
          { status: 404 }
        )
      }
      
      const errorLog = (errorRows as any)[0]
      
      // Get resolution details if resolved
      let resolution = null
      if (errorLog.resolved_at) {
        const [resolutionRows] = await connection.execute(`
          SELECT 
            er.*,
            u.email as resolver_email,
            u.name as resolver_name
          FROM error_resolutions er
          LEFT JOIN users u ON er.resolver_id = u.id
          WHERE er.error_log_id = ?
          ORDER BY er.created_at DESC
          LIMIT 1
        `, [errorLog.id])
        
        if ((resolutionRows as any).length > 0) {
          resolution = (resolutionRows as any)[0]
        }
      }
      
      // Get family notifications related to this error
      const [notificationRows] = await connection.execute(`
        SELECT 
          fin.*,
          u.email as user_email,
          u.name as user_name
        FROM family_impact_notifications fin
        LEFT JOIN users u ON fin.user_id = u.id
        WHERE fin.error_log_id = ?
        ORDER BY fin.created_at DESC
      `, [errorLog.id])
      
      // Get similar errors (same category and severity in last 7 days)
      const [similarErrors] = await connection.execute(`
        SELECT 
          el.id,
          el.error_id,
          el.title,
          el.timestamp,
          el.resolved_at,
          u.email as user_email
        FROM error_logs el
        LEFT JOIN users u ON el.user_id = u.id
        WHERE el.category_id = ? 
          AND el.severity = ?
          AND el.id != ?
          AND el.timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY el.timestamp DESC
        LIMIT 10
      `, [errorLog.category_id, errorLog.severity, errorLog.id])
      
      return NextResponse.json({
        success: true,
        data: {
          error: errorLog,
          resolution,
          familyNotifications: notificationRows,
          similarErrors,
          analysis: {
            requiresImmediateAttention: errorLog.crisis_indicator || errorLog.family_impact === 'severe',
            affectsGrievingFamilies: errorLog.grief_context_detected,
            escalationRecommended: errorLog.severity === 'emergency' || (errorLog.family_impact === 'high' && !errorLog.resolved_at),
            familyCommunicationNeeded: errorLog.family_impact !== 'none' && !errorLog.family_notification_sent
          }
        }
      })
      
    } finally {
      await connection.end()
    }
    
  } catch (error) {
    console.error('Error fetching error details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch error details' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    const errorId = params.id
    const body = await request.json()
    const { action, ...updateData } = body
    
    const connection = await mysql.createConnection(dbConfig)
    
    try {
      // Get current error details
      const [errorRows] = await connection.execute(
        'SELECT * FROM error_logs WHERE id = ? OR error_id = ?',
        [errorId, errorId]
      )
      
      if ((errorRows as any).length === 0) {
        return NextResponse.json(
          { error: 'Error log not found' },
          { status: 404 }
        )
      }
      
      const currentError = (errorRows as any)[0]
      
      if (action === 'resolve') {
        const {
          resolutionType = 'fixed',
          rootCause,
          stepsTaken,
          preventionMeasures,
          familyCommunicationMessage,
          followUpRequired = false,
          followUpDate
        } = updateData
        
        // Calculate resolution time
        const resolutionTimeMinutes = Math.floor(
          (new Date().getTime() - new Date(currentError.timestamp).getTime()) / (1000 * 60)
        )
        
        // Update error log as resolved
        await connection.execute(`
          UPDATE error_logs 
          SET resolved_at = NOW(), resolved_by = ?, resolution_notes = ?
          WHERE id = ?
        `, [session.user.id, stepsTaken, currentError.id])
        
        // Insert resolution details
        await connection.execute(`
          INSERT INTO error_resolutions (
            error_log_id, resolution_type, resolver_id, resolution_time_minutes,
            steps_taken, root_cause, prevention_measures, 
            family_communication_sent, family_communication_message,
            follow_up_required, follow_up_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          currentError.id, resolutionType, session.user.id, resolutionTimeMinutes,
          stepsTaken, rootCause, preventionMeasures,
          !!familyCommunicationMessage, familyCommunicationMessage,
          followUpRequired, followUpDate
        ])
        
        // If family communication message provided, send notification
        if (familyCommunicationMessage && (currentError.family_id || currentError.user_id)) {
          await connection.execute(`
            INSERT INTO family_impact_notifications (
              error_log_id, family_id, user_id, notification_type,
              personalized_message, compassionate_tone
            ) VALUES (?, ?, ?, 'in_app', ?, TRUE)
          `, [currentError.id, currentError.family_id, currentError.user_id, familyCommunicationMessage])
          
          // Mark family notification as sent
          await connection.execute(
            'UPDATE error_logs SET family_notification_sent = TRUE WHERE id = ?',
            [currentError.id]
          )
        }
        
        return NextResponse.json({
          success: true,
          message: 'Error resolved successfully with family-sensitive handling'
        })
        
      } else if (action === 'update') {
        const allowedFields = ['severity', 'family_impact', 'title', 'affected_feature', 'crisis_indicator', 'grief_context_detected']
        const updateFields = []
        const updateValues = []
        
        for (const [key, value] of Object.entries(updateData)) {
          if (allowedFields.includes(key)) {
            updateFields.push(`${key} = ?`)
            updateValues.push(value)
          }
        }
        
        if (updateFields.length === 0) {
          return NextResponse.json(
            { error: 'No valid fields to update' },
            { status: 400 }
          )
        }
        
        updateValues.push(currentError.id)
        
        await connection.execute(
          `UPDATE error_logs SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
          updateValues
        )
        
        return NextResponse.json({
          success: true,
          message: 'Error updated successfully'
        })
        
      } else if (action === 'escalate') {
        await connection.execute(`
          UPDATE error_logs 
          SET escalated_to_support = TRUE, crisis_indicator = TRUE, updated_at = NOW() 
          WHERE id = ?
        `, [currentError.id])
        
        // Create high-priority notification for family if needed
        if (currentError.family_id || currentError.user_id) {
          await connection.execute(`
            INSERT INTO family_impact_notifications (
              error_log_id, family_id, user_id, notification_type,
              message_template, compassionate_tone, support_offered, counseling_referral
            ) VALUES (?, ?, ?, 'email', 'crisis_escalation_compassionate', TRUE, TRUE, TRUE)
          `, [currentError.id, currentError.family_id, currentError.user_id])
        }
        
        return NextResponse.json({
          success: true,
          message: 'Error escalated to crisis support team'
        })
        
      } else {
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
      }
      
    } finally {
      await connection.end()
    }
    
  } catch (error) {
    console.error('Error updating error log:', error)
    return NextResponse.json(
      { error: 'Failed to update error log' },
      { status: 500 }
    )
  }
}