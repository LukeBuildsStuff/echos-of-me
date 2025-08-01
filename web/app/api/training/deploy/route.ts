import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { mistralInferenceEngine } from '@/lib/mistral-inference-engine'
import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

/**
 * Model Deployment and Inference API
 * Handles deployment of trained models for inference
 * Supports both text-only and voice-integrated models
 */

interface DeploymentConfig {
  modelPath: string
  deploymentName: string
  inferenceType: 'text' | 'voice_integrated'
  resourceAllocation: {
    gpuMemoryGB: number
    maxConcurrentRequests: number
    timeoutSeconds: number
  }
  optimizations: {
    quantization: '4bit' | '8bit' | 'none'
    batchProcessing: boolean
    caching: boolean
  }
}

interface InferenceRequest {
  prompt: string
  modelId: string
  options?: {
    maxTokens?: number
    temperature?: number
    includeVoice?: boolean
    emotionalTone?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'deploy_model':
        return await deployModel(params, session.user.email)
      case 'inference':
        return await runInference(params, session.user.email)
      case 'get_deployments':
        return await getUserDeployments(session.user.email)
      case 'update_deployment':
        return await updateDeployment(params, session.user.email)
      case 'delete_deployment':
        return await deleteDeployment(params, session.user.email)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Deployment API error:', error)
    return NextResponse.json(
      { 
        error: 'Deployment operation failed',
        message: error?.message || 'Unknown error'
      },
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

    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view') || 'deployments'

    switch (view) {
      case 'deployments':
        return await getUserDeployments(session.user.email)
      case 'available_models':
        return await getAvailableModels(session.user.email)
      case 'deployment_status':
        const deploymentId = searchParams.get('deploymentId')
        return await getDeploymentStatus(deploymentId, session.user.email)
      case 'inference_history':
        return await getInferenceHistory(session.user.email)
      default:
        return NextResponse.json({ error: 'Invalid view' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Deployment status error:', error)
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 }
    )
  }
}

// Deployment Functions

async function deployModel(params: any, userEmail: string) {
  const { modelVersionId, deploymentName, inferenceType = 'text', optimizations = {} } = params

  try {
    const userId = await getUserIdByEmail(userEmail)

    // Get model version details
    const modelResult = await query(`
      SELECT mv.*, tr.model_name, tr.checkpoint_path, tr.training_params
      FROM model_versions mv
      JOIN training_runs tr ON mv.id = tr.id
      WHERE mv.id = $1 AND mv.user_id = $2 AND mv.status = 'completed'
    `, [modelVersionId, userId])

    if (modelResult.rows.length === 0) {
      return NextResponse.json({
        error: 'Model not found or not completed training'
      }, { status: 404 })
    }

    const model = modelResult.rows[0]

    // Check if deployment already exists
    const existingDeployment = await query(`
      SELECT id FROM model_deployments 
      WHERE user_id = $1 AND deployment_name = $2 AND status != 'deleted'
    `, [userId, deploymentName])

    if (existingDeployment.rows.length > 0) {
      return NextResponse.json({
        error: 'Deployment name already exists'
      }, { status: 409 })
    }

    // Create deployment configuration
    const deploymentConfig: DeploymentConfig = {
      modelPath: model.checkpoint_path || `/tmp/ai-training/models/${model.id}`,
      deploymentName,
      inferenceType,
      resourceAllocation: {
        gpuMemoryGB: Math.min(16, Math.max(4, Math.ceil(model.model_size / 1000))),
        maxConcurrentRequests: inferenceType === 'voice_integrated' ? 2 : 5,
        timeoutSeconds: inferenceType === 'voice_integrated' ? 60 : 30
      },
      optimizations: {
        quantization: optimizations.quantization || '4bit',
        batchProcessing: optimizations.batchProcessing !== false,
        caching: optimizations.caching !== false
      }
    }

    // Create deployment record
    const deploymentId = crypto.randomUUID()
    await query(`
      INSERT INTO model_deployments (
        id, user_id, model_version_id, deployment_name, status, 
        deployment_config, created_at
      ) VALUES ($1, $2, $3, $4, 'deploying', $5, CURRENT_TIMESTAMP)
    `, [
      deploymentId,
      userId,
      modelVersionId,
      deploymentName,
      JSON.stringify(deploymentConfig)
    ])

    // Deploy model using Mistral inference engine
    try {
      const modelPath = model.checkpoint_path || `/tmp/ai-training/models/${model.id}`
      const actualDeploymentId = await mistralInferenceEngine.deployModel(
        userId.toString(),
        modelPath,
        model.version || '1'
      )

      // Update deployment record with success
      await query(`
        UPDATE model_deployments 
        SET status = 'deployed', endpoint_url = $1, deployed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [`/api/inference/${actualDeploymentId}`, deploymentId])

      return NextResponse.json({
        success: true,
        deploymentId: actualDeploymentId,
        deploymentName,
        status: 'deployed',
        endpointUrl: `/api/inference/${actualDeploymentId}`,
        capabilities: {
          textGeneration: true,
          voiceIntegration: inferenceType === 'voice_integrated',
          familyLegacyOptimized: true,
          mistralArchitecture: true,
          rtx5090Optimized: true
        }
      })
    } catch (deploymentError) {
      await query(`
        UPDATE model_deployments 
        SET status = 'failed', error_details = $1
        WHERE id = $2
      `, [JSON.stringify({ error: deploymentResult.error }), deploymentId])

      return NextResponse.json({
        error: 'Deployment failed',
        details: deploymentResult.error
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Model deployment error:', error)
    return NextResponse.json({
      error: 'Deployment failed',
      message: error.message
    }, { status: 500 })
  }
}

async function runInference(params: InferenceRequest, userEmail: string) {
  const { prompt, modelId, options = {} } = params

  try {
    const userId = await getUserIdByEmail(userEmail)

    // Check if this is a direct inference request to Mistral engine
    const deployment = await mistralInferenceEngine.getDeploymentStatus(modelId)
    
    if (!deployment || deployment.userId !== userId.toString()) {
      return NextResponse.json({
        error: 'Model deployment not found or not available'
      }, { status: 404 })
    }

    // Prepare inference request for Mistral engine
    const inferenceRequest = {
      modelId,
      userId: userId.toString(),
      query: prompt,
      context: options.context,
      maxTokens: options.maxTokens || 256,
      temperature: options.temperature || 0.7,
      includeVoice: options.includeVoice || false,
      conversationHistory: options.conversationHistory || []
    }

    // Run inference with Mistral engine
    const inferenceResult = await mistralInferenceEngine.generateResponse(inferenceRequest)

    return NextResponse.json({
      success: true,
      result: {
        text: inferenceResult.response,
        tokens: inferenceResult.tokenCount,
        responseTime: inferenceResult.responseTime,
        confidence: inferenceResult.confidence,
        emotionalTone: inferenceResult.emotionalTone,
        voiceSynthesis: inferenceResult.voiceSynthesis
      },
      metadata: {
        modelId,
        modelVersion: inferenceResult.metadata.modelVersion,
        familyLegacyOptimized: true,
        timestamp: inferenceResult.metadata.timestamp
      }
    })

  } catch (error: any) {
    console.error('Mistral inference error:', error)
    return NextResponse.json({
      error: 'Inference failed',
      message: error.message
    }, { status: 500 })
  }
}

async function getUserDeployments(userEmail: string) {
  try {
    const userId = await getUserIdByEmail(userEmail)

    const deployments = await query(`
      SELECT 
        md.id, md.deployment_name, md.status, md.endpoint_url,
        md.deployment_config, md.created_at, md.deployed_at,
        mv.version, mv.performance, tr.model_name
      FROM model_deployments md
      JOIN model_versions mv ON md.model_version_id = mv.id
      JOIN training_runs tr ON mv.id = tr.id
      WHERE md.user_id = $1 AND md.status != 'deleted'
      ORDER BY md.created_at DESC
    `, [userId])

    const formattedDeployments = deployments.rows.map(deployment => ({
      id: deployment.id,
      name: deployment.deployment_name,
      modelName: deployment.model_name,
      version: deployment.version,
      status: deployment.status,
      endpointUrl: deployment.endpoint_url,
      config: JSON.parse(deployment.deployment_config || '{}'),
      performance: JSON.parse(deployment.performance || '{}'),
      createdAt: deployment.created_at,
      deployedAt: deployment.deployed_at
    }))

    return NextResponse.json({
      success: true,
      deployments: formattedDeployments,
      total: formattedDeployments.length
    })

  } catch (error: any) {
    console.error('Get deployments error:', error)
    return NextResponse.json({
      error: 'Failed to get deployments'
    }, { status: 500 })
  }
}

async function getAvailableModels(userEmail: string) {
  try {
    const userId = await getUserIdByEmail(userEmail)

    const models = await query(`
      SELECT 
        mv.id, mv.version, mv.trained_at, mv.performance, mv.status,
        tr.model_name, tr.training_params, tr.integration_type
      FROM model_versions mv
      JOIN training_runs tr ON mv.id = tr.id
      WHERE mv.user_id = $1 AND mv.status = 'completed'
      ORDER BY mv.trained_at DESC
    `, [userId])

    const availableModels = models.rows.map(model => ({
      id: model.id,
      name: model.model_name,
      version: model.version,
      trainedAt: model.trained_at,
      performance: JSON.parse(model.performance || '{}'),
      integrationType: model.integration_type,
      capabilities: {
        textGeneration: true,
        voiceIntegration: model.integration_type === 'voice_llm_integrated',
        conversational: true
      },
      isDeployed: false // Will be updated by checking deployments
    }))

    // Check which models are already deployed
    const deployedModels = await query(`
      SELECT model_version_id FROM model_deployments 
      WHERE user_id = $1 AND status = 'deployed'
    `, [userId])

    const deployedModelIds = new Set(deployedModels.rows.map(d => d.model_version_id))
    availableModels.forEach(model => {
      model.isDeployed = deployedModelIds.has(model.id)
    })

    return NextResponse.json({
      success: true,
      models: availableModels,
      total: availableModels.length
    })

  } catch (error: any) {
    console.error('Get available models error:', error)
    return NextResponse.json({
      error: 'Failed to get available models'
    }, { status: 500 })
  }
}

async function getDeploymentStatus(deploymentId: string | null, userEmail: string) {
  if (!deploymentId) {
    return NextResponse.json({ error: 'Deployment ID required' }, { status: 400 })
  }

  try {
    const userId = await getUserIdByEmail(userEmail)

    const deployment = await query(`
      SELECT 
        md.*, mv.performance, tr.model_name,
        (SELECT COUNT(*) FROM inference_logs il WHERE il.deployment_id = md.id) as inference_count
      FROM model_deployments md
      JOIN model_versions mv ON md.model_version_id = mv.id  
      JOIN training_runs tr ON mv.id = tr.id
      WHERE md.id = $1 AND md.user_id = $2
    `, [deploymentId, userId])

    if (deployment.rows.length === 0) {
      return NextResponse.json({
        error: 'Deployment not found'
      }, { status: 404 })
    }

    const dep = deployment.rows[0]
    const config = JSON.parse(dep.deployment_config || '{}')

    // Get recent inference metrics
    const recentMetrics = await query(`
      SELECT 
        AVG(response_time_ms) as avg_response_time,
        COUNT(*) as request_count,
        AVG(LENGTH(response_text)) as avg_response_length
      FROM inference_logs 
      WHERE deployment_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
    `, [deploymentId])

    const metrics = recentMetrics.rows[0]

    return NextResponse.json({
      success: true,
      deployment: {
        id: dep.id,
        name: dep.deployment_name,
        modelName: dep.model_name,
        status: dep.status,
        endpointUrl: dep.endpoint_url,
        config,
        performance: JSON.parse(dep.performance || '{}'),
        createdAt: dep.created_at,
        deployedAt: dep.deployed_at,
        totalInferences: parseInt(dep.inference_count || 0),
        metrics: {
          avgResponseTime: Math.round(parseFloat(metrics.avg_response_time || 0)),
          requestCount24h: parseInt(metrics.request_count || 0),
          avgResponseLength: Math.round(parseFloat(metrics.avg_response_length || 0))
        }
      }
    })

  } catch (error: any) {
    console.error('Get deployment status error:', error)
    return NextResponse.json({
      error: 'Failed to get deployment status'
    }, { status: 500 })
  }
}

async function updateDeployment(params: any, userEmail: string) {
  const { deploymentId, updates } = params

  try {
    const userId = await getUserIdByEmail(userEmail)

    // Verify ownership
    const deployment = await query(`
      SELECT id FROM model_deployments 
      WHERE id = $1 AND user_id = $2
    `, [deploymentId, userId])

    if (deployment.rows.length === 0) {
      return NextResponse.json({
        error: 'Deployment not found'
      }, { status: 404 })
    }

    // Update deployment configuration
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (updates.config) {
      updateFields.push(`deployment_config = $${paramIndex}`)
      updateValues.push(JSON.stringify(updates.config))
      paramIndex++
    }

    if (updates.status) {
      updateFields.push(`status = $${paramIndex}`)
      updateValues.push(updates.status)
      paramIndex++
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    updateValues.push(deploymentId)

    await query(`
      UPDATE model_deployments 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `, updateValues)

    return NextResponse.json({
      success: true,
      message: 'Deployment updated successfully'
    })

  } catch (error: any) {
    console.error('Update deployment error:', error)
    return NextResponse.json({
      error: 'Failed to update deployment'
    }, { status: 500 })
  }
}

async function deleteDeployment(params: any, userEmail: string) {
  const { deploymentId } = params

  try {
    const userId = await getUserIdByEmail(userEmail)

    // Verify ownership and get deployment details
    const deployment = await query(`
      SELECT id, status, endpoint_url FROM model_deployments 
      WHERE id = $1 AND user_id = $2
    `, [deploymentId, userId])

    if (deployment.rows.length === 0) {
      return NextResponse.json({
        error: 'Deployment not found'
      }, { status: 404 })
    }

    // Mark as deleted (soft delete)
    await query(`
      UPDATE model_deployments 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [deploymentId])

    // TODO: Cleanup actual deployment resources
    // This would involve stopping the inference server, cleaning up files, etc.

    return NextResponse.json({
      success: true,
      message: 'Deployment deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete deployment error:', error)
    return NextResponse.json({
      error: 'Failed to delete deployment'
    }, { status: 500 })
  }
}

async function getInferenceHistory(userEmail: string) {
  try {
    const userId = await getUserIdByEmail(userEmail)

    const history = await query(`
      SELECT 
        il.*, md.deployment_name, mv.version
      FROM inference_logs il
      JOIN model_deployments md ON il.deployment_id = md.id
      JOIN model_versions mv ON md.model_version_id = mv.id
      WHERE md.user_id = $1
      ORDER BY il.created_at DESC
      LIMIT 50
    `, [userId])

    return NextResponse.json({
      success: true,
      history: history.rows.map(log => ({
        id: log.id,
        deploymentName: log.deployment_name,
        modelVersion: log.version,
        prompt: log.prompt_text.substring(0, 100) + '...', // Truncate for privacy
        responseLength: log.response_text?.length || 0,
        responseTime: log.response_time_ms,
        success: log.success,
        createdAt: log.created_at
      }))
    })

  } catch (error: any) {
    console.error('Get inference history error:', error)
    return NextResponse.json({
      error: 'Failed to get inference history'
    }, { status: 500 })
  }
}

// Helper Functions

async function getUserIdByEmail(email: string): Promise<number> {
  const result = await query('SELECT id FROM users WHERE email = $1', [email])
  if (result.rows.length === 0) {
    throw new Error('User not found')
  }
  return result.rows[0].id
}

async function startDeploymentProcess(deploymentId: string, config: DeploymentConfig, model: any) {
  // Create deployment script
  const deploymentScript = `
import torch
import transformers
from transformers import AutoTokenizer, AutoModelForCausalLM
import json
import sys
from datetime import datetime
import os
from pathlib import Path

class ModelDeploymentServer:
    def __init__(self, model_path, config):
        self.model_path = model_path
        self.config = config
        self.model = None
        self.tokenizer = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
    def load_model(self):
        """Load the trained model with optimizations"""
        try:
            print(f"Loading model from {self.model_path}")
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
                
            # Model loading configuration
            model_kwargs = {
                'torch_dtype': torch.bfloat16,
                'device_map': 'auto',
                'trust_remote_code': True,
            }
            
            # Apply quantization if specified
            if self.config.get('optimizations', {}).get('quantization') == '4bit':
                model_kwargs.update({
                    'load_in_4bit': True,
                    'bnb_4bit_compute_dtype': torch.bfloat16,
                    'bnb_4bit_use_double_quant': True,
                    'bnb_4bit_quant_type': 'nf4'
                })
            elif self.config.get('optimizations', {}).get('quantization') == '8bit':
                model_kwargs['load_in_8bit'] = True
                
            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_path,
                **model_kwargs
            )
            
            self.model.eval()
            print("Model loaded successfully")
            return True
            
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def generate_response(self, prompt, options=None):
        """Generate response from the model"""
        if not self.model or not self.tokenizer:
            return {"error": "Model not loaded"}
            
        options = options or {}
        max_tokens = options.get('maxTokens', 150)
        temperature = options.get('temperature', 0.7)
        
        try:
            # Tokenize input
            inputs = self.tokenizer(prompt, return_tensors='pt', truncation=True, max_length=2048)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Generate
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=temperature,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                    repetition_penalty=1.1,
                    no_repeat_ngram_size=3
                )
            
            # Decode response
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            # Remove the original prompt from response
            response = response[len(prompt):].strip()
            
            return {
                "success": True,
                "response": response,
                "tokens_generated": len(outputs[0]) - len(inputs['input_ids'][0])
            }
            
        except Exception as e:
            return {"error": f"Generation failed: {str(e)}"}

def main():
    """Main deployment function"""
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        return
        
    model_path = sys.argv[1]
    config_path = sys.argv[2]
    
    # Load configuration
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Initialize deployment server
    server = ModelDeploymentServer(model_path, config)
    
    # Load model
    if server.load_model():
        # Test inference
        test_response = server.generate_response(
            "Hello, how are you?",
            {"maxTokens": 50, "temperature": 0.7}
        )
        
        if test_response.get("success"):
            result = {
                "success": True,
                "endpointUrl": f"http://localhost:8000/inference/${deploymentId}",
                "status": "deployed",
                "testResponse": test_response["response"][:100]
            }
        else:
            result = {
                "success": False,
                "error": "Model test inference failed"
            }
    else:
        result = {
            "success": False,
            "error": "Failed to load model"
        }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
`

  // Write deployment script and config
  const deploymentDir = join('/tmp/ai-training/deployments', deploymentId)
  await fs.mkdir(deploymentDir, { recursive: true })
  
  const scriptPath = join(deploymentDir, 'deploy.py')
  const configPath = join(deploymentDir, 'config.json')
  
  await fs.writeFile(scriptPath, deploymentScript)
  await fs.writeFile(configPath, JSON.stringify(config, null, 2))

  // Run deployment
  return new Promise((resolve) => {
    const process = spawn('python3', [scriptPath, config.modelPath, configPath])
    let output = ''
    let error = ''

    process.stdout.on('data', (data) => {
      output += data.toString()
    })

    process.stderr.on('data', (data) => {
      error += data.toString()
    })

    process.on('close', (code) => {
      try {
        if (code === 0 && output) {
          const result = JSON.parse(output.trim())
          resolve(result)
        } else {
          resolve({
            success: false,
            error: error || 'Deployment process failed'
          })
        }
      } catch (parseError) {
        resolve({
          success: false,
          error: 'Failed to parse deployment result'
        })
      }
    })

    // Timeout after 5 minutes
    setTimeout(() => {
      process.kill()
      resolve({
        success: false,
        error: 'Deployment timeout'
      })
    }, 300000)
  })
}

async function executeInference(deployment: any, config: DeploymentConfig, prompt: string, options: any) {
  const startTime = Date.now()
  
  // For now, return a mock response
  // In production, this would call the actual deployed model
  const mockResponse = {
    text: `This is a response from your personalized AI model "${deployment.deployment_name}". ${prompt} - I understand you're asking about this topic, and based on our previous conversations and your personality, here's my thoughtful response...`,
    tokens: 45,
    responseTime: Date.now() - startTime,
    confidence: 0.87,
    voiceEnabled: config.inferenceType === 'voice_integrated'
  }

  // If voice integration is enabled, add voice synthesis info
  if (config.inferenceType === 'voice_integrated' && options.includeVoice) {
    mockResponse['voiceSynthesis'] = {
      available: true,
      audioUrl: `/api/voice/synthesize?text=${encodeURIComponent(mockResponse.text)}&userId=${deployment.user_id}`,
      duration: Math.ceil(mockResponse.text.length / 10), // Rough estimate
      quality: 'high'
    }
  }

  return mockResponse
}

async function logInference(userId: number, deploymentId: string, prompt: string, result: any, options: any) {
  try {
    await query(`
      INSERT INTO inference_logs (
        id, user_id, deployment_id, prompt_text, response_text,
        response_time_ms, success, options, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    `, [
      crypto.randomUUID(),
      userId,
      deploymentId,
      prompt.substring(0, 1000), // Limit prompt storage
      result.text?.substring(0, 2000) || '', // Limit response storage
      result.responseTime || 0,
      !!result.text,
      JSON.stringify(options)
    ])
  } catch (error) {
    console.error('Error logging inference:', error)
  }
}