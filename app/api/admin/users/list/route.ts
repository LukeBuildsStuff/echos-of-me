import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query, QueryOptimizer } from '@/lib/db'
import adminCache, { AdminCache } from '@/lib/admin-cache'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Paginated users list endpoint with filtering, sorting, and caching
 * Optimized for large datasets with virtual scrolling support
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200) // Max 200 per page
    const offset = (page - 1) * limit

    // Sorting parameters
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortDirection = searchParams.get('sortDirection') === 'asc' ? 'ASC' : 'DESC'

    // Filter parameters
    const search = searchParams.get('search')
    const status = searchParams.get('status') // active, inactive, all
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const role = searchParams.get('role')

    // Cache parameters
    const useCache = searchParams.get('cache') !== 'false'
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Build filter conditions
    const filterConditions: string[] = []
    const queryParams: any[] = []
    let paramIndex = 1

    if (search) {
      filterConditions.push(`(
        email ILIKE $${paramIndex} OR 
        name ILIKE $${paramIndex} OR 
        id::text ILIKE $${paramIndex}
      )`)
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        filterConditions.push(`last_login_at >= NOW() - INTERVAL '30 days'`)
      } else if (status === 'inactive') {
        filterConditions.push(`(last_login_at IS NULL OR last_login_at < NOW() - INTERVAL '30 days')`)
      }
    }

    if (dateFrom) {
      filterConditions.push(`created_at >= $${paramIndex}`)
      queryParams.push(dateFrom)
      paramIndex++
    }

    if (dateTo) {
      filterConditions.push(`created_at <= $${paramIndex}`)
      queryParams.push(dateTo)
      paramIndex++
    }

    if (role) {
      filterConditions.push(`role = $${paramIndex}`)
      queryParams.push(role)
      paramIndex++
    }

    const whereClause = filterConditions.length > 0 
      ? `WHERE ${filterConditions.join(' AND ')}` 
      : ''

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = [
      'id', 'email', 'name', 'created_at', 'updated_at', 
      'last_login_at', 'role', 'email_verified'
    ]
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at'

    // Generate cache key
    const cacheKey = AdminCache.users.getList(page, limit) + 
      `_${safeSortBy}_${sortDirection}_${JSON.stringify({
        search, status, dateFrom, dateTo, role
      })}`

    // Clear cache if force refresh
    if (forceRefresh) {
      await adminCache.invalidatePattern('users:list')
    }

    // Get or fetch data with caching
    const result = await adminCache.getOrSet(
      cacheKey,
      async () => {
        // Get total count
        const countQuery = `
          SELECT COUNT(*) as total
          FROM users
          ${whereClause}
        `
        const countResult = await query(countQuery, queryParams)
        const totalCount = parseInt(countResult.rows[0].total)

        // Get paginated data
        const dataQuery = `
          SELECT 
            id,
            email,
            name,
            role,
            created_at,
            updated_at,
            last_login_at,
            email_verified,
            CASE 
              WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 'active'
              WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 'inactive'
              ELSE 'dormant'
            END as activity_status,
            EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 as days_since_signup,
            (
              SELECT COUNT(*)
              FROM responses r
              WHERE r.user_id = users.id
            ) as response_count,
            (
              SELECT COUNT(*)
              FROM training_runs tr
              WHERE tr.user_id = users.id
            ) as training_count
          FROM users
          ${whereClause}
          ORDER BY ${safeSortBy} ${sortDirection}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `

        const dataParams = [...queryParams, limit, offset]
        const dataResult = await query(dataQuery, dataParams)

        return {
          users: dataResult.rows,
          totalCount,
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            hasNext: page * limit < totalCount,
            hasPrev: page > 1
          }
        }
      },
      300 // 5 minute cache
    )

    // Add metadata
    const response = {
      ...result,
      meta: {
        filters: { search, status, dateFrom, dateTo, role },
        sorting: { sortBy: safeSortBy, direction: sortDirection },
        cached: true,
        queriedAt: new Date().toISOString()
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': forceRefresh ? 'no-cache' : 'public, max-age=300',
        'X-Total-Count': result.totalCount.toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString(),
        'X-Total-Pages': result.pagination.totalPages.toString()
      }
    })

  } catch (error) {
    console.error('Admin users list error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch users list',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

/**
 * Bulk operations on users
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, userIds, data } = body

    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and userIds array are required' },
        { status: 400 }
      )
    }

    // Limit bulk operations to prevent performance issues
    if (userIds.length > 100) {
      return NextResponse.json(
        { error: 'Bulk operations limited to 100 users at a time' },
        { status: 400 }
      )
    }

    let result = { success: 0, failed: 0, errors: [] as Array<{userId: string, error: string}> }

    switch (action) {
      case 'delete':
        for (const userId of userIds) {
          try {
            await query('DELETE FROM users WHERE id = $1', [userId])
            result.success++
          } catch (error) {
            result.failed++
            result.errors.push({ userId, error: error instanceof Error ? error.message : String(error) })
          }
        }
        break

      case 'update_role':
        if (!data?.role) {
          return NextResponse.json(
            { error: 'Role is required for update_role action' },
            { status: 400 }
          )
        }
        
        for (const userId of userIds) {
          try {
            await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', 
              [data.role, userId])
            result.success++
          } catch (error) {
            result.failed++
            result.errors.push({ userId, error: error instanceof Error ? error.message : String(error) })
          }
        }
        break

      case 'activate':
        for (const userId of userIds) {
          try {
            await query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1', 
              [userId])
            result.success++
          } catch (error) {
            result.failed++
            result.errors.push({ userId, error: error instanceof Error ? error.message : String(error) })
          }
        }
        break

      case 'deactivate':
        for (const userId of userIds) {
          try {
            await query('UPDATE users SET email_verified = false, updated_at = NOW() WHERE id = $1', 
              [userId])
            result.success++
          } catch (error) {
            result.failed++
            result.errors.push({ userId, error: error instanceof Error ? error.message : String(error) })
          }
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: delete, update_role, activate, deactivate' },
          { status: 400 }
        )
    }

    // Invalidate relevant caches after bulk operations
    await adminCache.invalidatePattern('users:')

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Bulk users operation error:', error)
    return NextResponse.json(
      { 
        error: 'Bulk operation failed',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})