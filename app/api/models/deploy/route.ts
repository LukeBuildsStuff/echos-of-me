import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { mistralInferenceEngine } from '@/lib/mistral-inference-engine'
import { query } from '@/lib/db'

/**
 * Model Deployment API
 * 
 * Handles deployment, unloading, and status management of Mistral models
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, modelPath, modelVersion } = body

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userId = userResult.rows[0].id

    switch (action) {
      case 'deploy':
        if (!modelPath || !modelVersion) {
          return NextResponse.json({ error: 'Missing modelPath or modelVersion' }, { status: 400 })
        }

        try {
          const deploymentId = await mistralInferenceEngine.deployModel(userId, modelPath, modelVersion)
          
          return NextResponse.json({
            success: true,
            deploymentId,
            message: 'Model deployed successfully',
            status: 'loading'
          })
        } catch (error) {
          console.error('Model deployment failed:', error)
          return NextResponse.json({
            error: 'Model deployment failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 })
        }

      case 'undeploy':
        const { deploymentId } = body
        if (!deploymentId) {
          return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 })
        }

        try {
          await mistralInferenceEngine.unloadModel(deploymentId)
          
          return NextResponse.json({
            success: true,
            message: 'Model undeployed successfully'
          })
        } catch (error) {
          console.error('Model unloading failed:', error)
          return NextResponse.json({
            error: 'Model unloading failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 })
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Model deployment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userId = userResult.rows[0].id

    // Get user's deployments
    const deployments = await mistralInferenceEngine.getUserDeployments(userId)
    
    // Get engine statistics
    const engineStats = mistralInferenceEngine.getEngineStats()

    return NextResponse.json({
      deployments: deployments.map(d => ({
        id: d.id,
        modelVersion: d.modelVersion,
        status: d.status,
        loadedAt: d.loadedAt,
        memoryUsage: d.memoryUsage,
        inferenceCount: d.inferenceCount,
        lastUsed: d.lastUsed
      })),
      engineStats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Model deployment status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}