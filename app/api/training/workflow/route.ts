import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { voiceLLMIntegrator } from '@/lib/voice-llm-integration'
import crypto from 'crypto'

/**
 * Complete Training Workflow Orchestrator
 * Manages the end-to-end training pipeline from data collection to deployment
 * Integrates all components: data collection, formatting, training, voice integration, and deployment
 */

interface WorkflowStage {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  estimatedDuration: number
  startedAt?: Date
  completedAt?: Date
  error?: string
  dependencies: string[]
}

interface TrainingWorkflow {
  id: string
  userId: number
  status: 'initializing' | 'running' | 'completed' | 'failed'
  stages: Record<string, WorkflowStage>
  overallProgress: number
  estimatedCompletion: Date
  createdAt: Date
  completedAt?: Date
  results?: any
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'start_complete_workflow':
        return await startCompleteTrainingWorkflow(params)
      case 'start_data_collection':
        return await startDataCollection(params)
      case 'start_voice_integration':
        return await startVoiceIntegration(params)
      case 'deploy_model':
        return await deployTrainedModel(params)
      case 'get_workflow_status':
        return await getWorkflowStatus(params)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Workflow orchestrator error:', error)
    return NextResponse.json(
      { 
        error: 'Workflow operation failed',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
})

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const workflowId = searchParams.get('workflowId')

    if (workflowId) {
      return await getWorkflowDetails(workflowId)
    } else if (userId) {
      return await getUserWorkflows(parseInt(userId))
    } else {
      return await getAllActiveWorkflows()
    }

  } catch (error: any) {
    console.error('Workflow status error:', error)
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 }
    )
  }
})

// Complete Training Workflow

async function startCompleteTrainingWorkflow(params: any) {
  const { userId, includeVoiceIntegration = true, autoDeployment = false } = params

  try {
    // Validate user exists and has necessary data
    const userValidation = await validateUserForTraining(userId)
    if (!userValidation.valid) {
      return NextResponse.json({
        error: 'User validation failed',
        details: userValidation.issues
      }, { status: 400 })
    }

    // Create workflow
    const workflowId = crypto.randomUUID()
    const workflow = await createTrainingWorkflow(workflowId, userId, includeVoiceIntegration, autoDeployment)
    
    // Start workflow execution
    executeWorkflowAsync(workflow)

    return NextResponse.json({
      success: true,
      workflowId,
      message: 'Complete training workflow started successfully',
      estimatedCompletion: workflow.estimatedCompletion,
      stages: Object.keys(workflow.stages),
      features: {
        dataCollection: true,
        modelTraining: true,
        voiceIntegration: includeVoiceIntegration,
        autoDeployment
      }
    })

  } catch (error: any) {
    console.error('Complete workflow start error:', error)
    return NextResponse.json({
      error: 'Failed to start complete workflow',
      message: error.message
    }, { status: 500 })
  }
}

async function createTrainingWorkflow(workflowId: string, userId: number, includeVoice: boolean, autoDeploy: boolean): Promise<TrainingWorkflow> {
  const stages: Record<string, WorkflowStage> = {
    data_collection: {
      name: 'Data Collection & Processing',
      status: 'pending',
      progress: 0,
      estimatedDuration: 5, // minutes
      dependencies: []
    },
    data_formatting: {
      name: 'Training Data Formatting',
      status: 'pending',
      progress: 0,
      estimatedDuration: 3,
      dependencies: ['data_collection']
    },
    model_training: {
      name: 'LLM Training (RTX 5090)',
      status: 'pending',
      progress: 0,
      estimatedDuration: 120, // 2 hours
      dependencies: ['data_formatting']
    }
  }

  if (includeVoice) {
    stages.voice_integration = {
      name: 'Voice-LLM Integration',
      status: 'pending',
      progress: 0,
      estimatedDuration: 45,
      dependencies: ['model_training']
    }
  }

  if (autoDeploy) {
    stages.model_deployment = {
      name: 'Model Deployment',
      status: 'pending',
      progress: 0,
      estimatedDuration: 10,
      dependencies: includeVoice ? ['voice_integration'] : ['model_training']
    }
  }

  const totalDuration = Object.values(stages).reduce((sum, stage) => sum + stage.estimatedDuration, 0)

  const workflow: TrainingWorkflow = {
    id: workflowId,
    userId,
    status: 'initializing',
    stages,
    overallProgress: 0,
    estimatedCompletion: new Date(Date.now() + totalDuration * 60 * 1000),
    createdAt: new Date()
  }

  // Store workflow in database
  await query(`
    INSERT INTO training_workflows (
      id, user_id, status, stages, estimated_completion, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    workflowId,
    userId,
    'initializing',
    JSON.stringify(stages),
    workflow.estimatedCompletion,
    workflow.createdAt
  ])

  return workflow
}

async function executeWorkflowAsync(workflow: TrainingWorkflow) {
  console.log(`Starting workflow execution: ${workflow.id}`)
  
  try {
    // Update workflow status
    workflow.status = 'running'
    await updateWorkflowInDatabase(workflow)

    // Execute stages in dependency order
    const stageOrder = determineExecutionOrder(workflow.stages)
    
    for (const stageName of stageOrder) {
      const stage = workflow.stages[stageName]
      
      // Wait for dependencies
      await waitForDependencies(workflow, stage.dependencies)
      
      // Execute stage
      stage.status = 'running'
      stage.startedAt = new Date()
      await updateWorkflowInDatabase(workflow)
      
      const result = await executeWorkflowStage(workflow, stageName)
      
      if (result.success) {
        stage.status = 'completed'
        stage.progress = 100
        stage.completedAt = new Date()
      } else {
        stage.status = 'failed'
        stage.error = result.error
        workflow.status = 'failed'
        await updateWorkflowInDatabase(workflow)
        return
      }
      
      // Update overall progress
      workflow.overallProgress = calculateOverallProgress(workflow.stages)
      await updateWorkflowInDatabase(workflow)
    }

    // Complete workflow
    workflow.status = 'completed'
    workflow.completedAt = new Date()
    workflow.overallProgress = 100
    await updateWorkflowInDatabase(workflow)
    
    console.log(`Workflow completed successfully: ${workflow.id}`)

  } catch (error) {
    console.error(`Workflow execution failed: ${workflow.id}`, error)
    workflow.status = 'failed'
    await updateWorkflowInDatabase(workflow)
  }
}

async function executeWorkflowStage(workflow: TrainingWorkflow, stageName: string): Promise<{ success: boolean; error?: string; result?: any }> {
  console.log(`Executing stage: ${stageName} for workflow: ${workflow.id}`)
  
  try {
    switch (stageName) {
      case 'data_collection':
        return await executeDataCollectionStage(workflow)
      
      case 'data_formatting':
        return await executeDataFormattingStage(workflow)
      
      case 'model_training':
        return await executeModelTrainingStage(workflow)
      
      case 'voice_integration':
        return await executeVoiceIntegrationStage(workflow)
      
      case 'model_deployment':
        return await executeModelDeploymentStage(workflow)
      
      default:
        return { success: false, error: `Unknown stage: ${stageName}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function executeDataCollectionStage(workflow: TrainingWorkflow) {
  // Call data collection API
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/training/collect-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: workflow.userId,
      includeLifeStories: true,
      includeMilestones: true,
      minWordCount: 20
    })
  })

  if (response.ok) {
    const result = await response.json()
    return { success: true, result }
  } else {
    const error = await response.json()
    return { success: false, error: error.message }
  }
}

async function executeDataFormattingStage(workflow: TrainingWorkflow) {
  // Call data formatting API
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/training/format-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: workflow.userId,
      format: 'conversational',
      includeSystemPrompts: true,
      maxLength: 2048
    })
  })

  if (response.ok) {
    const result = await response.json()
    return { success: true, result }
  } else {
    const error = await response.json()
    return { success: false, error: error.message }
  }
}

async function executeModelTrainingStage(workflow: TrainingWorkflow) {
  // Call RTX 5090 training manager
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/training/rtx5090-manager`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'start_training',
      userId: workflow.userId,
      priority: 'high',
      config: {
        hardware: {
          gpu: 'RTX_5090',
          vramOptimization: true,
          flashAttention2: true
        }
      }
    })
  })

  if (response.ok) {
    const result = await response.json()
    
    // Monitor training progress
    if (result.success) {
      await monitorTrainingProgress(workflow, result.jobId)
    }
    
    return { success: result.success, result, error: result.error }
  } else {
    const error = await response.json()
    return { success: false, error: error.message }
  }
}

async function executeVoiceIntegrationStage(workflow: TrainingWorkflow) {
  // Call voice-LLM integration
  const result = await voiceLLMIntegrator.integrateVoiceWithLLM(
    workflow.userId.toString(),
    'latest'
  )

  if (result.success) {
    // Monitor integration progress
    await monitorVoiceIntegrationProgress(workflow, result.trainingJobId)
  }

  return result
}

async function executeModelDeploymentStage(workflow: TrainingWorkflow) {
  // Get the latest trained model for this user
  const modelResult = await query(`
    SELECT mv.id, tr.model_name
    FROM model_versions mv
    JOIN training_runs tr ON mv.id = tr.id
    WHERE mv.user_id = $1 AND mv.status = 'completed'
    ORDER BY mv.trained_at DESC
    LIMIT 1
  `, [workflow.userId])

  if (modelResult.rows.length === 0) {
    return { success: false, error: 'No completed model found for deployment' }
  }

  const model = modelResult.rows[0]

  // Call deployment API
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/training/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'deploy_model',
      modelVersionId: model.id,
      deploymentName: `${model.model_name}_production`,
      inferenceType: workflow.stages.voice_integration ? 'voice_integrated' : 'text',
      optimizations: {
        quantization: '4bit',
        batchProcessing: true,
        caching: true
      }
    })
  })

  if (response.ok) {
    const result = await response.json()
    return { success: result.success, result, error: result.error }
  } else {
    const error = await response.json()
    return { success: false, error: error.message }
  }
}

// Helper Functions

async function validateUserForTraining(userId: number) {
  try {
    // Check if user exists
    const userResult = await query('SELECT id, email FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return { valid: false, issues: ['User not found'] }
    }

    // Check data availability
    const dataCheck = await query(`
      SELECT 
        COUNT(r.id) as response_count,
        COUNT(DISTINCT q.category) as category_count,
        SUM(r.word_count) as total_words
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1 AND r.word_count >= 20
    `, [userId])

    const stats = dataCheck.rows[0]
    const issues = []

    if (parseInt(stats.response_count) < 50) {
      issues.push(`Need ${50 - parseInt(stats.response_count)} more responses`)
    }
    if (parseInt(stats.category_count) < 5) {
      issues.push(`Need ${5 - parseInt(stats.category_count)} more question categories`)
    }
    if (parseInt(stats.total_words) < 5000) {
      issues.push(`Need ${5000 - parseInt(stats.total_words)} more words`)
    }

    return { valid: issues.length === 0, issues }

  } catch (error) {
    return { valid: false, issues: ['Validation error occurred'] }
  }
}

function determineExecutionOrder(stages: Record<string, WorkflowStage>): string[] {
  const order: string[] = []
  const completed = new Set<string>()

  while (order.length < Object.keys(stages).length) {
    for (const [stageName, stage] of Object.entries(stages)) {
      if (completed.has(stageName)) continue
      
      const dependenciesMet = stage.dependencies.every(dep => completed.has(dep))
      if (dependenciesMet) {
        order.push(stageName)
        completed.add(stageName)
        break
      }
    }
  }

  return order
}

async function waitForDependencies(workflow: TrainingWorkflow, dependencies: string[]) {
  for (const dep of dependencies) {
    while (workflow.stages[dep].status !== 'completed') {
      if (workflow.stages[dep].status === 'failed') {
        throw new Error(`Dependency ${dep} failed`)
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

function calculateOverallProgress(stages: Record<string, WorkflowStage>): number {
  const stageList = Object.values(stages)
  const totalProgress = stageList.reduce((sum, stage) => sum + stage.progress, 0)
  return Math.round(totalProgress / stageList.length)
}

async function updateWorkflowInDatabase(workflow: TrainingWorkflow) {
  await query(`
    UPDATE training_workflows 
    SET status = $1, stages = $2, overall_progress = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [
    workflow.status,
    JSON.stringify(workflow.stages),
    workflow.overallProgress,
    workflow.id
  ])
}

async function monitorTrainingProgress(workflow: TrainingWorkflow, jobId: string) {
  // This would monitor the training job and update the workflow stage progress
  // Implementation would depend on the training engine's progress reporting
  console.log(`Monitoring training progress for job: ${jobId}`)
}

async function monitorVoiceIntegrationProgress(workflow: TrainingWorkflow, integrationId?: string) {
  if (!integrationId) return
  
  // Monitor voice integration progress
  console.log(`Monitoring voice integration progress for: ${integrationId}`)
}

// Status and Information Functions

async function getWorkflowStatus(params: any) {
  const { workflowId } = params

  try {
    const result = await query(`
      SELECT * FROM training_workflows WHERE id = $1
    `, [workflowId])

    if (result.rows.length === 0) {
      return NextResponse.json({
        error: 'Workflow not found'
      }, { status: 404 })
    }

    const workflow = result.rows[0]
    const stages = JSON.parse(workflow.stages)

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow.id,
        userId: workflow.user_id,
        status: workflow.status,
        overallProgress: workflow.overall_progress,
        stages,
        estimatedCompletion: workflow.estimated_completion,
        createdAt: workflow.created_at,
        completedAt: workflow.completed_at
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to get workflow status'
    }, { status: 500 })
  }
}

async function getWorkflowDetails(workflowId: string) {
  // Implementation for detailed workflow information
  return await getWorkflowStatus({ workflowId })
}

async function getUserWorkflows(userId: number) {
  try {
    const result = await query(`
      SELECT * FROM training_workflows 
      WHERE user_id = $1 
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId])

    const workflows = result.rows.map(row => ({
      id: row.id,
      status: row.status,
      overallProgress: row.overall_progress,
      estimatedCompletion: row.estimated_completion,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      stageCount: Object.keys(JSON.parse(row.stages)).length
    }))

    return NextResponse.json({
      success: true,
      workflows,
      total: workflows.length
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to get user workflows'
    }, { status: 500 })
  }
}

async function getAllActiveWorkflows() {
  try {
    const result = await query(`
      SELECT tw.*, u.email as user_email
      FROM training_workflows tw
      JOIN users u ON tw.user_id = u.id
      WHERE tw.status IN ('initializing', 'running')
      ORDER BY tw.created_at DESC
    `)

    const workflows = result.rows.map(row => ({
      id: row.id,
      userEmail: row.user_email,
      status: row.status,
      overallProgress: row.overall_progress,
      estimatedCompletion: row.estimated_completion,
      createdAt: row.created_at,
      stages: JSON.parse(row.stages)
    }))

    return NextResponse.json({
      success: true,
      activeWorkflows: workflows,
      total: workflows.length
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to get active workflows'
    }, { status: 500 })
  }
}

// Standalone Stage Functions

async function startDataCollection(params: any) {
  const { userId } = params
  return await executeDataCollectionStage({ userId } as any)
}

async function startVoiceIntegration(params: any) {
  const { userId } = params
  return await executeVoiceIntegrationStage({ userId } as any)
}

async function deployTrainedModel(params: any) {
  const { userId } = params
  return await executeModelDeploymentStage({ userId } as any)
}