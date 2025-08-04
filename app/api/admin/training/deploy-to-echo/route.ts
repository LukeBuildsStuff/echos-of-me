import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import crypto from 'crypto'

/**
 * Deploy to Echo API
 * One-click deployment of trained models to AI Echo chat system
 * Handles model registration, endpoint configuration, and health checks
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { 
      modelVersionId, 
      userId, 
      deploymentName, 
      enableVoiceIntegration = false,
      autoActivate = true 
    } = body

    // Validate inputs
    if (!modelVersionId || !userId) {
      return NextResponse.json({
        error: 'Model version ID and user ID are required'
      }, { status: 400 })
    }

    // Get model version details
    const modelResult = await query(`
      SELECT 
        mv.id, mv.version, mv.status, mv.performance, mv.metadata,
        tr.model_name, tr.checkpoint_path, tr.training_params, tr.completed_at,
        tr.base_model, tr.training_samples,
        u.name as user_name, u.email as user_email
      FROM model_versions mv
      JOIN training_runs tr ON mv.training_run_id = tr.id
      JOIN users u ON tr.user_id = u.id
      WHERE mv.id = $1 AND tr.user_id = $2 AND mv.status = 'completed'
    `, [modelVersionId, userId])

    if (modelResult.rows.length === 0) {
      return NextResponse.json({
        error: 'Model version not found, not completed, or access denied'
      }, { status: 404 })
    }

    const model = modelResult.rows[0]
    const performance = JSON.parse(model.performance || '{}')
    const trainingParams = JSON.parse(model.training_params || '{}')

    // Check model quality before deployment
    const qualityCheck = await validateModelQuality(model, performance)
    if (!qualityCheck.passed) {
      return NextResponse.json({
        error: 'Model quality check failed',
        details: qualityCheck.issues,
        recommendations: qualityCheck.recommendations
      }, { status: 400 })
    }

    // Generate deployment configuration
    const deploymentConfig = generateDeploymentConfig(model, trainingParams, enableVoiceIntegration)
    const deploymentId = crypto.randomUUID()

    // Create deployment record
    await query(`
      INSERT INTO echo_deployments (
        id, user_id, model_version_id, deployment_name, status,
        deployment_config, voice_integration_enabled, auto_activate,
        created_at
      ) VALUES ($1, $2, $3, $4, 'deploying', $5, $6, $7, CURRENT_TIMESTAMP)
    `, [
      deploymentId,
      userId,
      modelVersionId,
      deploymentName || `${model.model_name}_echo`,
      JSON.stringify(deploymentConfig),
      enableVoiceIntegration,
      autoActivate
    ])

    // Deploy model to inference service
    const deploymentResult = await deployModelToInference(deploymentId, deploymentConfig, model)

    if (deploymentResult.success) {
      // Update deployment record with success
      await query(`
        UPDATE echo_deployments 
        SET 
          status = 'deployed',
          endpoint_url = $1,
          deployed_at = CURRENT_TIMESTAMP,
          health_check_url = $2
        WHERE id = $3
      `, [
        deploymentResult.endpointUrl,
        deploymentResult.healthCheckUrl,
        deploymentId
      ])

      // If auto-activate is enabled, set this as the active model for Echo chat
      if (autoActivate) {
        await activateModelForEcho(userId, deploymentId, model)
      }

      // Run initial health check
      const healthCheck = await performHealthCheck(deploymentResult.healthCheckUrl, model)

      // Test model with sample queries
      const testResults = await runDeploymentTests(deploymentResult.endpointUrl, model)

      return NextResponse.json({
        success: true,
        deploymentId,
        deploymentName: deploymentName || `${model.model_name}_echo`,
        status: 'deployed',
        endpointUrl: deploymentResult.endpointUrl,
        healthCheckUrl: deploymentResult.healthCheckUrl,
        autoActivated: autoActivate,
        qualityMetrics: {
          overallScore: qualityCheck.overallScore,
          coherenceScore: performance.coherenceScore || 0,
          personaMatchScore: performance.personaMatchScore || 0,
          responseQuality: performance.responseQuality || 0
        },
        healthCheck: {
          status: healthCheck.status,
          responseTime: healthCheck.responseTime,
          timestamp: healthCheck.timestamp
        },
        testResults: {
          passed: testResults.passed,
          totalTests: testResults.tests.length,
          passedTests: testResults.tests.filter(t => t.passed).length,
          sampleResponses: testResults.tests.slice(0, 3).map(t => ({
            query: t.query,
            response: t.response?.substring(0, 100) + '...',
            passed: t.passed,
            score: t.score
          }))
        },
        capabilities: {
          textGeneration: true,
          voiceIntegration: enableVoiceIntegration,
          conversationalMemory: true,
          personaConsistency: true,
          emotionalIntelligence: performance.emotionalIntelligence || false
        },
        integrationInfo: {
          echoCompatible: true,
          apiVersion: 'v1',
          modelFormat: 'huggingface',
          estimatedLatency: `${deploymentConfig.performance.expectedLatency}ms`
        }
      })

    } else {
      // Update deployment record with failure
      await query(`
        UPDATE echo_deployments 
        SET status = 'failed', error_details = $1
        WHERE id = $2
      `, [JSON.stringify({ error: deploymentResult.error }), deploymentId])

      return NextResponse.json({
        error: 'Deployment to Echo failed',
        details: deploymentResult.error,
        troubleshooting: deploymentResult.troubleshooting || []
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Deploy to Echo error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to deploy to Echo chat',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
})

// GET endpoint to check deployment status and manage Echo integrations
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'list'
    const userId = searchParams.get('userId')
    const deploymentId = searchParams.get('deploymentId')

    switch (action) {
      case 'list':
        return await listEchoDeployments(userId)
      case 'status':
        return await getDeploymentStatus(deploymentId)
      case 'health':
        return await checkDeploymentHealth(deploymentId)
      case 'test':
        return await runDeploymentTest(deploymentId)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Deploy to Echo GET error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
})

// Helper functions

async function validateModelQuality(model: any, performance: any) {
  const issues = []
  const recommendations = []
  let overallScore = 0

  // Check performance metrics
  const coherenceScore = performance.coherenceScore || 0
  const personaMatchScore = performance.personaMatchScore || 0
  const responseQuality = performance.responseQuality || 0

  if (coherenceScore < 0.7) {
    issues.push('Low coherence score')
    recommendations.push('Consider additional training with more diverse examples')
  } else {
    overallScore += 25
  }

  if (personaMatchScore < 0.8) {
    issues.push('Low persona consistency')
    recommendations.push('Review training data for consistent personality traits')
  } else {
    overallScore += 30
  }

  if (responseQuality < 0.7) {
    issues.push('Low response quality')
    recommendations.push('Add more high-quality training examples')
  } else {
    overallScore += 25
  }

  // Check training samples
  if (model.training_samples < 100) {
    issues.push('Insufficient training data')
    recommendations.push('Collect more training examples for better performance')
  } else {
    overallScore += 20
  }

  const passed = issues.length === 0 || overallScore >= 60

  return {
    passed,
    overallScore,
    issues,
    recommendations
  }
}

function generateDeploymentConfig(model: any, trainingParams: any, enableVoiceIntegration: boolean) {
  return {
    modelId: model.id,
    modelName: model.model_name,
    baseModel: model.base_model,
    version: model.version,
    deployment: {
      containerImage: 'ai-echo/inference:latest',
      replicas: 1,
      resources: {
        cpu: '2',
        memory: '8Gi',
        gpu: enableVoiceIntegration ? '1' : '0.5'
      }
    },
    inference: {
      maxTokens: 512,
      temperature: 0.7,
      topP: 0.9,
      repetitionPenalty: 1.1,
      stopSequences: ['<|endoftext|>', '\n\nHuman:', '\n\nUser:']
    },
    performance: {
      expectedLatency: enableVoiceIntegration ? 2000 : 800,
      maxConcurrentRequests: 10,
      timeoutMs: 30000
    },
    features: {
      conversationalMemory: true,
      contextWindow: 2048,
      voiceIntegration: enableVoiceIntegration,
      emotionalTone: true,
      personaConsistency: true
    },
    security: {
      rateLimiting: {
        requestsPerMinute: 60,
        requestsPerHour: 1000
      },
      contentFiltering: true,
      auditLogging: true
    }
  }
}

async function deployModelToInference(deploymentId: string, config: any, model: any) {
  try {
    const mlInferenceUrl = process.env.ML_INFERENCE_URL || 'http://ml-inference:8000'
    
    const deployRequest = {
      deploymentId,
      modelPath: model.checkpoint_path,
      config,
      modelMetadata: {
        name: model.model_name,
        version: model.version,
        baseModel: model.base_model,
        userId: model.user_id,
        trainingSamples: model.training_samples
      }
    }

    const response = await fetch(`${mlInferenceUrl}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deployRequest),
      signal: AbortSignal.timeout(120000) // 2 minute timeout for deployment
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Deployment failed: ${response.status} - ${errorData.error || 'Unknown error'}`)
    }

    const result = await response.json()
    
    return {
      success: true,
      endpointUrl: result.endpointUrl || `${mlInferenceUrl}/chat/${deploymentId}`,
      healthCheckUrl: result.healthCheckUrl || `${mlInferenceUrl}/health/${deploymentId}`,
      deploymentDetails: result
    }

  } catch (error: any) {
    console.error('Model deployment error:', error)
    
    const troubleshooting = [
      'Check if ML inference service is running',
      'Verify model checkpoint path exists',
      'Ensure sufficient GPU memory is available',
      'Check network connectivity to inference service'
    ]

    return {
      success: false,
      error: error.message,
      troubleshooting
    }
  }
}

async function activateModelForEcho(userId: string, deploymentId: string, model: any) {
  try {
    // Deactivate any existing active model for this user
    await query(`
      UPDATE echo_deployments 
      SET is_active = false
      WHERE user_id = $1 AND is_active = true
    `, [userId])

    // Activate the new model
    await query(`
      UPDATE echo_deployments 
      SET is_active = true, activated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [deploymentId])

    // Update user's Echo chat configuration
    await query(`
      INSERT INTO user_echo_config (user_id, active_model_deployment_id, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        active_model_deployment_id = $2,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, deploymentId])

    return true
  } catch (error) {
    console.error('Model activation error:', error)
    return false
  }
}

async function performHealthCheck(healthCheckUrl: string, model: any) {
  try {
    const startTime = Date.now()
    const response = await fetch(healthCheckUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    const responseTime = Date.now() - startTime
    const status = response.ok ? 'healthy' : 'unhealthy'

    return {
      status,
      responseTime,
      timestamp: new Date().toISOString(),
      details: response.ok ? 'Service is responding' : `HTTP ${response.status}`
    }
  } catch (error) {
    return {
      status: 'error',
      responseTime: -1,
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Health check failed'
    }
  }
}

async function runDeploymentTests(endpointUrl: string, model: any) {
  const testQueries = [
    'How are you doing today?',
    'What advice would you give to someone starting their career?',
    'Tell me about a memory that shaped who you are.',
    'What values are most important to you?',
    'How do you handle difficult situations?'
  ]

  const tests = []
  let passed = 0

  for (const query of testQueries) {
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          max_tokens: 150,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(15000)
      })

      if (response.ok) {
        const result = await response.json()
        const responseText = result.response || result.text || ''
        
        // Basic quality checks
        const hasResponse = responseText.length > 10
        const isCoherent = responseText.split(' ').length > 5
        const notEmpty = !responseText.toLowerCase().includes('error')
        
        const testPassed = hasResponse && isCoherent && notEmpty
        if (testPassed) passed++

        tests.push({
          query,
          response: responseText,
          passed: testPassed,
          score: testPassed ? 1.0 : 0.0,
          latency: response.headers.get('X-Response-Time') || 'unknown'
        })
      } else {
        tests.push({
          query,
          response: null,
          passed: false,
          score: 0.0,
          error: `HTTP ${response.status}`,
          latency: 'failed'
        })
      }
    } catch (error) {
      tests.push({
        query,
        response: null,
        passed: false,
        score: 0.0,
        error: error instanceof Error ? error.message : 'Test failed',
        latency: 'timeout'
      })
    }
  }

  return {
    passed: passed >= Math.ceil(testQueries.length * 0.6), // 60% pass rate
    totalScore: passed / testQueries.length,
    tests
  }
}

async function listEchoDeployments(userId?: string | null) {
  const whereClause = userId ? 'WHERE ed.user_id = $1' : ''
  const params = userId ? [userId] : []

  const deployments = await query(`
    SELECT 
      ed.id, ed.deployment_name, ed.status, ed.endpoint_url,
      ed.voice_integration_enabled, ed.is_active, ed.created_at, ed.deployed_at,
      mv.version, mv.performance,
      tr.model_name, tr.training_samples,
      u.name as user_name, u.email as user_email
    FROM echo_deployments ed
    JOIN model_versions mv ON ed.model_version_id = mv.id
    JOIN training_runs tr ON mv.training_run_id = tr.id
    JOIN users u ON ed.user_id = u.id
    ${whereClause}
    ORDER BY ed.created_at DESC
  `, params)

  return NextResponse.json({
    success: true,
    deployments: deployments.rows.map(dep => ({
      id: dep.id,
      name: dep.deployment_name,
      modelName: dep.model_name,
      version: dep.version,
      status: dep.status,
      isActive: dep.is_active,
      userName: dep.user_name,
      userEmail: dep.user_email,
      voiceIntegration: dep.voice_integration_enabled,
      trainingSamples: dep.training_samples,
      performance: JSON.parse(dep.performance || '{}'),
      createdAt: dep.created_at,
      deployedAt: dep.deployed_at,
      endpointUrl: dep.endpoint_url
    })),
    total: deployments.rows.length
  })
}

async function getDeploymentStatus(deploymentId?: string | null) {
  if (!deploymentId) {
    return NextResponse.json({ error: 'Deployment ID required' }, { status: 400 })
  }

  const deployment = await query(`
    SELECT 
      ed.*, mv.performance, tr.model_name,
      u.name as user_name, u.email as user_email
    FROM echo_deployments ed
    JOIN model_versions mv ON ed.model_version_id = mv.id
    JOIN training_runs tr ON mv.training_run_id = tr.id
    JOIN users u ON ed.user_id = u.id
    WHERE ed.id = $1
  `, [deploymentId])

  if (deployment.rows.length === 0) {
    return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
  }

  const dep = deployment.rows[0]
  
  return NextResponse.json({
    success: true,
    deployment: {
      id: dep.id,
      name: dep.deployment_name,
      modelName: dep.model_name,
      status: dep.status,
      isActive: dep.is_active,
      userName: dep.user_name,
      userEmail: dep.user_email,
      endpointUrl: dep.endpoint_url,
      healthCheckUrl: dep.health_check_url,
      voiceIntegration: dep.voice_integration_enabled,
      config: JSON.parse(dep.deployment_config || '{}'),
      performance: JSON.parse(dep.performance || '{}'),
      createdAt: dep.created_at,
      deployedAt: dep.deployed_at,
      activatedAt: dep.activated_at
    }
  })
}

async function checkDeploymentHealth(deploymentId?: string | null) {
  if (!deploymentId) {
    return NextResponse.json({ error: 'Deployment ID required' }, { status: 400 })
  }

  const deployment = await query(`
    SELECT health_check_url FROM echo_deployments WHERE id = $1
  `, [deploymentId])

  if (deployment.rows.length === 0) {
    return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
  }

  const healthCheckUrl = deployment.rows[0].health_check_url
  if (!healthCheckUrl) {
    return NextResponse.json({ error: 'Health check URL not available' }, { status: 400 })
  }

  const healthCheck = await performHealthCheck(healthCheckUrl, {})
  
  return NextResponse.json({
    success: true,
    health: healthCheck
  })
}

async function runDeploymentTest(deploymentId?: string | null) {
  if (!deploymentId) {
    return NextResponse.json({ error: 'Deployment ID required' }, { status: 400 })
  }

  const deployment = await query(`
    SELECT endpoint_url FROM echo_deployments WHERE id = $1
  `, [deploymentId])

  if (deployment.rows.length === 0) {
    return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
  }

  const endpointUrl = deployment.rows[0].endpoint_url
  if (!endpointUrl) {
    return NextResponse.json({ error: 'Endpoint URL not available' }, { status: 400 })
  }

  const testResults = await runDeploymentTests(endpointUrl, {})
  
  return NextResponse.json({
    success: true,
    testResults
  })
}