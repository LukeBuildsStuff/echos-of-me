import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface RecoveryAction {
  id: string
  type: 'retry' | 'reset' | 'fallback' | 'escalate'
  context: string
  description: string
  automated: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedTime?: number
  dependencies?: string[]
}

export interface RecoveryResult {
  success: boolean
  actionId: string
  message: string
  recovered: boolean
  nextAction?: RecoveryAction
  retryAfter?: number
}

// Mock recovery actions database
const recoveryActions: Record<string, RecoveryAction[]> = {
  'rtx-monitoring': [
    {
      id: 'rtx-reconnect',
      type: 'retry',
      context: 'rtx-monitoring',
      description: 'Reconnect to RTX monitoring stream',
      automated: true,
      priority: 'high',
      estimatedTime: 5000
    },
    {
      id: 'rtx-reset-stream',
      type: 'reset',
      context: 'rtx-monitoring',
      description: 'Reset RTX monitoring stream connection',
      automated: true,
      priority: 'medium',
      estimatedTime: 10000
    },
    {
      id: 'rtx-fallback-polling',
      type: 'fallback',
      context: 'rtx-monitoring',
      description: 'Switch to polling mode for RTX monitoring',
      automated: true,
      priority: 'low',
      estimatedTime: 2000
    }
  ],
  'training-jobs': [
    {
      id: 'training-retry-fetch',
      type: 'retry',
      context: 'training-jobs',
      description: 'Retry fetching training job data',
      automated: true,
      priority: 'medium',
      estimatedTime: 3000
    },
    {
      id: 'training-cache-fallback',
      type: 'fallback',
      context: 'training-jobs',
      description: 'Use cached training job data',
      automated: true,
      priority: 'low',
      estimatedTime: 1000
    }
  ],
  'user-auth': [
    {
      id: 'auth-token-refresh',
      type: 'retry',
      context: 'user-auth',
      description: 'Refresh authentication token',
      automated: true,
      priority: 'high',
      estimatedTime: 2000
    },
    {
      id: 'auth-escalate-relogin',
      type: 'escalate',
      context: 'user-auth',
      description: 'Require user re-authentication',
      automated: false,
      priority: 'critical'
    }
  ],
  'database': [
    {
      id: 'db-connection-retry',
      type: 'retry',
      context: 'database',
      description: 'Retry database connection',
      automated: true,
      priority: 'critical',
      estimatedTime: 5000
    },
    {
      id: 'db-connection-reset',
      type: 'reset',
      context: 'database',
      description: 'Reset database connection pool',
      automated: true,
      priority: 'critical',
      estimatedTime: 15000
    },
    {
      id: 'db-readonly-fallback',
      type: 'fallback',
      context: 'database',
      description: 'Switch to read-only database replica',
      automated: true,
      priority: 'high',
      estimatedTime: 3000
    }
  ]
}

// POST /api/errors/recovery - Execute recovery action
export async function POST(request: NextRequest) {
  try {
    const { actionId, context, errorDetails } = await request.json()

    // Find the recovery action
    const contextActions = recoveryActions[context] || []
    const action = contextActions.find(a => a.id === actionId)

    if (!action) {
      return NextResponse.json({
        success: false,
        message: `Recovery action ${actionId} not found for context ${context}`,
        recovered: false
      }, { status: 404 })
    }

    // Log recovery attempt
    console.log(`[RECOVERY] Executing ${action.type} action for ${context}:`, {
      actionId,
      description: action.description,
      errorDetails
    })

    // Simulate recovery action execution
    const result = await executeRecoveryAction(action, errorDetails)

    // Log result
    console.log(`[RECOVERY] Action ${actionId} result:`, result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[RECOVERY] Recovery action failed:', error)
    
    return NextResponse.json({
      success: false,
      actionId: '',
      message: 'Recovery system error',
      recovered: false
    }, { status: 500 })
  }
}

// GET /api/errors/recovery - Get available recovery actions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const context = searchParams.get('context')
    const priority = searchParams.get('priority')

    if (context) {
      let actions = recoveryActions[context] || []
      
      if (priority) {
        actions = actions.filter(action => action.priority === priority)
      }
      
      return NextResponse.json({
        context,
        actions: actions.sort((a, b) => {
          const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        })
      })
    }

    // Return all recovery actions grouped by context
    const allActions = Object.entries(recoveryActions).map(([ctx, actions]) => ({
      context: ctx,
      actions: actions.sort((a, b) => {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
    }))

    return NextResponse.json({ recoveryActions: allActions })
  } catch (error) {
    console.error('[RECOVERY] Failed to fetch recovery actions:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch recovery actions'
    }, { status: 500 })
  }
}

// Simulate executing a recovery action
async function executeRecoveryAction(
  action: RecoveryAction,
  errorDetails?: any
): Promise<RecoveryResult> {
  // Add realistic delay
  if (action.estimatedTime) {
    await new Promise(resolve => setTimeout(resolve, action.estimatedTime))
  }

  // Simulate different outcomes based on action type and context
  const successRate = getSuccessRate(action)
  const isSuccess = Math.random() < successRate

  const result: RecoveryResult = {
    success: isSuccess,
    actionId: action.id,
    message: isSuccess 
      ? `Successfully executed ${action.description}`
      : `Failed to execute ${action.description}`,
    recovered: isSuccess
  }

  // Add context-specific logic
  switch (action.context) {
    case 'rtx-monitoring':
      if (action.type === 'retry' && !isSuccess) {
        result.nextAction = recoveryActions['rtx-monitoring'].find(a => a.type === 'reset')
        result.retryAfter = 5000
      } else if (action.type === 'reset' && !isSuccess) {
        result.nextAction = recoveryActions['rtx-monitoring'].find(a => a.type === 'fallback')
      }
      break

    case 'training-jobs':
      if (action.type === 'retry' && !isSuccess) {
        result.nextAction = recoveryActions['training-jobs'].find(a => a.type === 'fallback')
      }
      break

    case 'user-auth':
      if (action.type === 'retry' && !isSuccess) {
        result.nextAction = recoveryActions['user-auth'].find(a => a.type === 'escalate')
      }
      break

    case 'database':
      if (action.type === 'retry' && !isSuccess) {
        result.nextAction = recoveryActions['database'].find(a => a.type === 'reset')
      } else if (action.type === 'reset' && !isSuccess) {
        result.nextAction = recoveryActions['database'].find(a => a.type === 'fallback')
      }
      break
  }

  return result
}

// Get success rate based on action characteristics
function getSuccessRate(action: RecoveryAction): number {
  // Base success rates by action type
  const baseRates = {
    'retry': 0.7,
    'reset': 0.8,
    'fallback': 0.95,
    'escalate': 1.0 // Escalation always "succeeds" by definition
  }

  // Adjust based on priority (higher priority = lower success rate, indicating more serious issues)
  const priorityAdjustment = {
    'low': 0.1,
    'medium': 0.05,
    'high': -0.05,
    'critical': -0.1
  }

  // Adjust based on context (some systems are more reliable)
  const contextAdjustment: Record<string, number> = {
    'rtx-monitoring': -0.05, // Hardware monitoring can be flaky
    'training-jobs': 0.05,   // Training jobs are generally stable
    'user-auth': 0.1,        // Auth systems are usually reliable
    'database': -0.1         // Database issues tend to be more serious
  }

  let successRate = baseRates[action.type] || 0.5
  successRate += priorityAdjustment[action.priority] || 0
  successRate += contextAdjustment[action.context] || 0

  return Math.max(0.1, Math.min(1.0, successRate))
}