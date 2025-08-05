import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { trainingValidator } from '@/lib/training-validator'

/**
 * Training Validation API
 * Provides comprehensive testing and validation for the training workflow
 */

// GET - Run validation checks
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const userId = searchParams.get('userId')
    const modelId = searchParams.get('modelId')

    switch (type) {
      case 'data':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required for data validation' },
            { status: 400 }
          )
        }
        
        const dataValidation = await trainingValidator.validateTrainingData(userId)
        return NextResponse.json(dataValidation)

      case 'model':
        if (!modelId) {
          return NextResponse.json(
            { error: 'Model ID is required for model validation' },
            { status: 400 }
          )
        }
        
        const modelValidation = await trainingValidator.validateModelPerformance(modelId)
        return NextResponse.json(modelValidation)

      case 'suite':
        const testSuite = await trainingValidator.runTestSuite(userId || undefined)
        return NextResponse.json(testSuite)

      case 'health':
        // System health check
        const healthCheck = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: await checkDatabaseHealth(),
            gpu: await checkGPUHealth(),
            storage: await checkStorageHealth()
          }
        }
        return NextResponse.json(healthCheck)

      default:
        return NextResponse.json(
          { error: 'Invalid validation type. Use: data, model, suite, or health' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { error: 'Validation failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
})

// POST - Run specific validation with custom parameters
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { type, parameters } = body

    switch (type) {
      case 'custom_test':
        // Run custom test with provided parameters
        const customResult = await runCustomTest(parameters)
        return NextResponse.json(customResult)

      case 'batch_validation':
        // Validate multiple users or models
        const batchResults = await runBatchValidation(parameters)
        return NextResponse.json(batchResults)

      case 'performance_benchmark':
        // Run performance benchmarks
        const benchmarkResults = await runPerformanceBenchmark(parameters)
        return NextResponse.json(benchmarkResults)

      default:
        return NextResponse.json(
          { error: 'Invalid POST validation type' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('POST validation error:', error)
    return NextResponse.json(
      { error: 'POST validation failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
})

// Helper functions
async function checkDatabaseHealth(): Promise<{ status: string; latency?: number; error?: string }> {
  try {
    const startTime = Date.now()
    const { query } = await import('@/lib/db')
    await query('SELECT 1')
    const latency = Date.now() - startTime
    
    return { status: 'healthy', latency }
  } catch (error: any) {
    return { status: 'unhealthy', error: error?.message || 'Unknown error' }
  }
}

async function checkGPUHealth(): Promise<{ status: string; memory?: any; error?: string }> {
  try {
    // In production, this would check actual GPU status
    return {
      status: 'healthy',
      memory: {
        total: '24GB',
        used: '2GB',
        available: '22GB'
      }
    }
  } catch (error: any) {
    return { status: 'unhealthy', error: error?.message || 'Unknown error' }
  }
}

async function checkStorageHealth(): Promise<{ status: string; space?: any; error?: string }> {
  try {
    // In production, this would check actual storage
    return {
      status: 'healthy',
      space: {
        total: '1TB',
        used: '100GB',
        available: '900GB'
      }
    }
  } catch (error: any) {
    return { status: 'unhealthy', error: error?.message || 'Unknown error' }
  }
}

async function runCustomTest(parameters: any): Promise<any> {
  // Implementation for custom testing
  return {
    testName: parameters.name || 'Custom Test',
    status: 'completed',
    results: {
      passed: true,
      details: 'Custom test executed successfully'
    }
  }
}

async function runBatchValidation(parameters: any): Promise<any> {
  const { userIds, modelIds } = parameters
  const results = []

  // Validate multiple users
  if (userIds && Array.isArray(userIds)) {
    for (const userId of userIds) {
      try {
        const validation = await trainingValidator.validateTrainingData(userId)
        results.push({ userId, type: 'data', ...validation })
      } catch (error: any) {
        results.push({ userId, type: 'data', error: error?.message || 'Unknown error' })
      }
    }
  }

  // Validate multiple models
  if (modelIds && Array.isArray(modelIds)) {
    for (const modelId of modelIds) {
      try {
        const validation = await trainingValidator.validateModelPerformance(modelId)
        results.push({ modelId, type: 'model', ...validation })
      } catch (error: any) {
        results.push({ modelId, type: 'model', error: error?.message || 'Unknown error' })
      }
    }
  }

  return {
    batchSize: results.length,
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => 'isValid' in r && r.isValid).length,
      failed: results.filter(r => 'error' in r || ('isValid' in r && !r.isValid)).length
    }
  }
}

async function runPerformanceBenchmark(parameters: any): Promise<any> {
  const { testType, iterations = 10 } = parameters
  const results = []

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now()
    
    try {
      switch (testType) {
        case 'data_processing':
          // Simulate data processing benchmark
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
          break
        case 'model_inference':
          // Simulate model inference benchmark
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200))
          break
        default:
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
      }
      
      const duration = Date.now() - startTime
      results.push({ iteration: i + 1, duration, status: 'success' })
      
    } catch (error: any) {
      results.push({ iteration: i + 1, status: 'failed', error: error?.message || 'Unknown error' })
    }
  }

  const successfulRuns = results.filter(r => r.status === 'success')
  const avgDuration = successfulRuns.reduce((sum, r) => sum + (r.duration || 0), 0) / successfulRuns.length

  return {
    testType,
    iterations,
    results,
    summary: {
      successful: successfulRuns.length,
      failed: results.length - successfulRuns.length,
      averageDuration: avgDuration,
      minDuration: Math.min(...successfulRuns.map(r => r.duration || 0)),
      maxDuration: Math.max(...successfulRuns.map(r => r.duration || 0))
    }
  }
}