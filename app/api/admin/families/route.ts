import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAdminSession, logAdminAction, getGriefSensitiveErrorMessage } from '@/lib/admin-security'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const supportStatus = searchParams.get('supportStatus') || 'all'
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Verify admin permissions
    const authResult = await verifyAdminSession('families.read', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const offset = (page - 1) * limit

    // Build query conditions
    let whereConditions = ['1=1']
    let queryParams: any[] = []
    let paramIndex = 1

    if (search) {
      whereConditions.push(`(f.family_name ILIKE $${paramIndex} OR pc.name ILIKE $${paramIndex} OR pc.email ILIKE $${paramIndex})`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    if (supportStatus !== 'all') {
      whereConditions.push(`f.support_status = $${paramIndex}`)
      queryParams.push(supportStatus)
      paramIndex++
    }

    const whereClause = whereConditions.join(' AND ')

    // Get families with comprehensive information
    const familiesResult = await query(`
      SELECT 
        f.id,
        f.family_name,
        f.family_story,
        f.location,
        f.phone_number,
        f.emergency_contact_email,
        f.support_status,
        f.privacy_level,
        f.memorial_status,
        f.memorial_date,
        f.created_at,
        f.updated_at,
        pc.id as primary_contact_id,
        pc.name as primary_contact_name,
        pc.email as primary_contact_email,
        pc.last_login_at as primary_contact_last_active,
        (
          SELECT COUNT(*) 
          FROM family_members fm 
          WHERE fm.family_id = f.id
        ) as total_members,
        (
          SELECT COUNT(*) 
          FROM family_members fm 
          WHERE fm.family_id = f.id AND fm.emotional_support_needed = true
        ) as members_needing_support,
        (
          SELECT SUM(r.word_count) 
          FROM responses r 
          JOIN family_members fm ON r.user_id = fm.user_id 
          WHERE fm.family_id = f.id AND r.is_draft = false
        ) as total_memories_word_count,
        (
          SELECT COUNT(*) 
          FROM responses r 
          JOIN family_members fm ON r.user_id = fm.user_id 
          WHERE fm.family_id = f.id AND r.is_draft = false
        ) as total_memories_count,
        (
          SELECT COUNT(*) 
          FROM ai_conversation_analytics aca 
          WHERE aca.family_id = f.id
        ) as ai_interactions_count,
        (
          SELECT COUNT(*) 
          FROM crisis_detection_events cde 
          WHERE cde.family_id = f.id AND cde.status = 'active'
        ) as active_crisis_events,
        (
          SELECT MAX(fm_last.joined_family_at) 
          FROM family_members fm_last 
          WHERE fm_last.family_id = f.id
        ) as last_family_activity
      FROM families f
      LEFT JOIN users pc ON f.primary_contact_id = pc.id
      WHERE ${whereClause}
      ORDER BY ${sortBy === 'primary_contact_name' ? 'pc.name' : `f.${sortBy}`} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset])

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM families f
      LEFT JOIN users pc ON f.primary_contact_id = pc.id
      WHERE ${whereClause}
    `, queryParams)

    const totalFamilies = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalFamilies / limit)

    // Get family members for each family
    const familyIds = familiesResult.rows.map(f => f.id)
    let familyMembers = []

    if (familyIds.length > 0) {
      const membersResult = await query(`
        SELECT 
          fm.family_id,
          fm.family_role,
          fm.relationship_description,
          fm.is_guardian,
          fm.can_manage_family,
          fm.emotional_support_needed,
          fm.support_notes,
          fm.joined_family_at,
          u.id as user_id,
          u.name,
          u.email,
          u.last_login_at,
          u.memorial_account,
          (
            SELECT COUNT(*) 
            FROM responses r 
            WHERE r.user_id = u.id AND r.is_draft = false
          ) as memories_shared,
          (
            SELECT COUNT(*) 
            FROM ai_conversation_analytics aca 
            WHERE aca.user_id = u.id
          ) as ai_interactions,
          (
            SELECT COUNT(*) 
            FROM crisis_detection_events cde 
            WHERE cde.user_id = u.id AND cde.status = 'active'
          ) as active_crisis_count
        FROM family_members fm
        JOIN users u ON fm.user_id = u.id
        WHERE fm.family_id = ANY($1::uuid[])
        ORDER BY fm.family_role = 'primary' DESC, fm.joined_family_at ASC
      `, [familyIds])

      familyMembers = membersResult.rows
    }

    // Organize data
    const families = familiesResult.rows.map(family => {
      const members = familyMembers.filter(m => m.family_id === family.id)
      
      return {
        id: family.id,
        name: family.family_name,
        familyStory: family.family_story,
        location: family.location,
        phoneNumber: family.phone_number,
        emergencyContact: family.emergency_contact_email,
        supportStatus: family.support_status,
        privacyLevel: family.privacy_level,
        isMemorial: family.memorial_status,
        memorialDate: family.memorial_date,
        primaryContact: {
          id: family.primary_contact_id,
          name: family.primary_contact_name,
          email: family.primary_contact_email,
          lastActive: family.primary_contact_last_active
        },
        statistics: {
          totalMembers: parseInt(family.total_members) || 0,
          membersNeedingSupport: parseInt(family.members_needing_support) || 0,
          totalMemoriesCount: parseInt(family.total_memories_count) || 0,
          totalMemoriesWordCount: parseInt(family.total_memories_word_count) || 0,
          aiInteractionsCount: parseInt(family.ai_interactions_count) || 0,
          activeCrisisEvents: parseInt(family.active_crisis_events) || 0
        },
        members: members.map(member => ({
          id: member.user_id,
          name: member.name,
          email: member.email,
          familyRole: member.family_role,
          relationshipDescription: member.relationship_description,
          isGuardian: member.is_guardian,
          canManageFamily: member.can_manage_family,
          needsSupport: member.emotional_support_needed,
          supportNotes: member.support_notes,
          lastActive: member.last_login_at,
          joinedFamilyAt: member.joined_family_at,
          isMemorialAccount: member.memorial_account,
          memoriesShared: parseInt(member.memories_shared) || 0,
          aiInteractions: parseInt(member.ai_interactions) || 0,
          activeCrisisCount: parseInt(member.active_crisis_count) || 0
        })),
        lastActivity: family.last_family_activity,
        joinedDate: family.created_at,
        updatedAt: family.updated_at
      }
    })

    // Log the access
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'families_list_accessed',
      resource_type: 'families',
      action_details: {
        search,
        supportStatus,
        page,
        limit,
        resultsCount: families.length
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'low'
    })

    return NextResponse.json({
      success: true,
      data: {
        families,
        pagination: {
          currentPage: page,
          totalPages,
          totalFamilies,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Error fetching families:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('families.create', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      familyName,
      familyStory,
      primaryContactEmail,
      location,
      phoneNumber,
      emergencyContactEmail,
      privacyLevel = 'standard'
    } = body

    // Validate required fields
    if (!familyName || !primaryContactEmail) {
      return NextResponse.json(
        { error: 'Family name and primary contact email are required' },
        { status: 400 }
      )
    }

    // Find or verify primary contact user exists
    const userResult = await query(
      'SELECT id, name, email FROM users WHERE email = $1 AND is_active = true',
      [primaryContactEmail]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('user_not_found') },
        { status: 404 }
      )
    }

    const primaryContactUser = userResult.rows[0]

    // Create the family
    const familyResult = await query(`
      INSERT INTO families (
        family_name, family_story, primary_contact_id, location, 
        phone_number, emergency_contact_email, privacy_level, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      familyName,
      familyStory,
      primaryContactUser.id,
      location,
      phoneNumber,
      emergencyContactEmail,
      privacyLevel
    ])

    const newFamily = familyResult.rows[0]

    // Add primary contact as family member
    await query(`
      INSERT INTO family_members (
        family_id, user_id, family_role, is_guardian, can_manage_family, joined_family_at
      ) VALUES ($1, $2, 'primary', true, true, CURRENT_TIMESTAMP)
    `, [newFamily.id, primaryContactUser.id])

    // Log the creation
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'family_created',
      resource_type: 'family',
      resource_id: newFamily.id,
      target_user_id: primaryContactUser.id,
      action_details: {
        familyName,
        primaryContactEmail,
        privacyLevel
      },
      after_state: newFamily,
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'medium',
      compliance_relevant: true
    })

    return NextResponse.json({
      success: true,
      data: {
        family: {
          id: newFamily.id,
          name: newFamily.family_name,
          familyStory: newFamily.family_story,
          primaryContact: {
            id: primaryContactUser.id,
            name: primaryContactUser.name,
            email: primaryContactUser.email
          },
          supportStatus: newFamily.support_status,
          privacyLevel: newFamily.privacy_level,
          createdAt: newFamily.created_at
        }
      }
    })

  } catch (error) {
    console.error('Error creating family:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}