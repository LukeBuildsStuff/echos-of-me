import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { MilestoneMessage, LifeDetailEntry } from '@/lib/milestone-messages'

// GET /api/milestones - Get user's milestone messages and life entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'milestones' or 'entries'
    const category = searchParams.get('category')
    const recipient = searchParams.get('recipient')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get user ID
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userId = userResult.rows[0].id

    if (type === 'entries') {
      // Get life detail entries
      let query = `
        SELECT 
          id,
          entry_date,
          title,
          content,
          category,
          tags,
          related_people,
          emotional_depth,
          attached_question_id,
          is_private,
          created_at,
          updated_at
        FROM life_detail_entries
        WHERE user_id = $1
      `
      const params: any[] = [userId]
      let paramCount = 1

      if (category) {
        paramCount++
        query += ` AND category = $${paramCount}`
        params.push(category)
      }

      if (search) {
        paramCount++
        query += ` AND (
          title ILIKE $${paramCount} OR 
          content ILIKE $${paramCount} OR
          $${paramCount} = ANY(tags)
        )`
        params.push(`%${search}%`)
      }

      query += ` ORDER BY entry_date DESC, created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
      params.push(limit, offset)

      const entries = await db.query(query, params)

      // Get total count
      let countQuery = `
        SELECT COUNT(*) FROM life_detail_entries WHERE user_id = $1
      `
      const countParams: any[] = [userId]
      
      if (category) {
        countQuery += ` AND category = $2`
        countParams.push(category)
      }

      const countResult = await db.query(countQuery, countParams)

      return NextResponse.json({
        entries: entries.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      })

    } else {
      // Get milestone messages
      let query = `
        SELECT 
          id,
          milestone_type,
          custom_milestone_name,
          recipient_name,
          message_title,
          message_content,
          trigger_date,
          trigger_age,
          trigger_event,
          emotional_tone,
          tags,
          is_private,
          created_at,
          updated_at
        FROM milestone_messages
        WHERE user_id = $1
      `
      const params: any[] = [userId]
      let paramCount = 1

      if (recipient) {
        paramCount++
        query += ` AND (recipient_name = $${paramCount} OR recipient_name IS NULL)`
        params.push(recipient)
      }

      if (search) {
        paramCount++
        query += ` AND (
          message_title ILIKE $${paramCount} OR 
          message_content ILIKE $${paramCount}
        )`
        params.push(`%${search}%`)
      }

      query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`
      params.push(limit, offset)

      const milestones = await db.query(query, params)

      // Get total count
      const countResult = await db.query(
        'SELECT COUNT(*) FROM milestone_messages WHERE user_id = $1',
        [userId]
      )

      return NextResponse.json({
        milestones: milestones.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      })
    }

  } catch (error) {
    console.error('Error fetching milestones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    )
  }
}

// POST /api/milestones - Create a new milestone message or life entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type } = body

    // Get user ID
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userId = userResult.rows[0].id

    if (type === 'entry') {
      // Create life detail entry
      const {
        title,
        content,
        category,
        tags = [],
        relatedPeople = [],
        emotionalDepth = 5,
        attachedQuestionId,
        isPrivate = false,
        entryDate = new Date()
      } = body

      const result = await db.query(`
        INSERT INTO life_detail_entries (
          user_id,
          entry_date,
          title,
          content,
          category,
          tags,
          related_people,
          emotional_depth,
          attached_question_id,
          is_private
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        userId,
        entryDate,
        title,
        content,
        category,
        tags,
        relatedPeople,
        emotionalDepth,
        attachedQuestionId,
        isPrivate
      ])

      return NextResponse.json({
        success: true,
        entry: result.rows[0]
      })

    } else {
      // Create milestone message
      const {
        milestoneType,
        customMilestoneName,
        recipientName,
        messageTitle,
        messageContent,
        triggerDate,
        triggerAge,
        triggerEvent,
        emotionalTone,
        tags = [],
        isPrivate = false
      } = body

      const result = await db.query(`
        INSERT INTO milestone_messages (
          user_id,
          milestone_type,
          custom_milestone_name,
          recipient_name,
          message_title,
          message_content,
          trigger_date,
          trigger_age,
          trigger_event,
          emotional_tone,
          tags,
          is_private
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        userId,
        milestoneType,
        customMilestoneName,
        recipientName,
        messageTitle,
        messageContent,
        triggerDate,
        triggerAge,
        triggerEvent,
        emotionalTone,
        tags,
        isPrivate
      ])

      return NextResponse.json({
        success: true,
        milestone: result.rows[0]
      })
    }

  } catch (error) {
    console.error('Error creating milestone/entry:', error)
    return NextResponse.json(
      { error: 'Failed to create milestone/entry' },
      { status: 500 }
    )
  }
}

// PUT /api/milestones - Update a milestone message or life entry
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, type, ...updates } = body

    // Get user ID
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userId = userResult.rows[0].id

    if (type === 'entry') {
      // Update life detail entry
      const allowedUpdates = [
        'title', 'content', 'category', 'tags', 
        'related_people', 'emotional_depth', 'is_private'
      ]
      
      const updateFields = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .map((key, index) => `${key} = $${index + 3}`)
        .join(', ')
      
      const updateValues = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .map(key => updates[key])

      if (updateFields.length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
      }

      const result = await db.query(`
        UPDATE life_detail_entries
        SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [id, userId, ...updateValues])

      if (!result.rows[0]) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        entry: result.rows[0]
      })

    } else {
      // Update milestone message
      const allowedUpdates = [
        'message_title', 'message_content', 'trigger_date', 
        'trigger_age', 'trigger_event', 'emotional_tone', 
        'tags', 'is_private'
      ]
      
      const updateFields = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .map((key, index) => `${key} = $${index + 3}`)
        .join(', ')
      
      const updateValues = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .map(key => updates[key])

      if (updateFields.length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
      }

      const result = await db.query(`
        UPDATE milestone_messages
        SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [id, userId, ...updateValues])

      if (!result.rows[0]) {
        return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        milestone: result.rows[0]
      })
    }

  } catch (error) {
    console.error('Error updating milestone/entry:', error)
    return NextResponse.json(
      { error: 'Failed to update milestone/entry' },
      { status: 500 }
    )
  }
}

// DELETE /api/milestones - Delete a milestone message or life entry
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing id or type' }, { status: 400 })
    }

    // Get user ID
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userId = userResult.rows[0].id

    const table = type === 'entry' ? 'life_detail_entries' : 'milestone_messages'
    
    const result = await db.query(
      `DELETE FROM ${table} WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    )

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting milestone/entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete milestone/entry' },
      { status: 500 }
    )
  }
}