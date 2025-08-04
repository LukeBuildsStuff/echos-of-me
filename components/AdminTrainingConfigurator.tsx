'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorMessage } from '@/components/ui/error-message'
import { Loading } from '@/components/ui/loading'

interface TrainingConfig {
  // Model configuration
  model: {
    baseModel: string
    architecture: string
    contextLength: number
    precision: 'fp16' | 'bf16' | 'fp32'
    quantization: 'none' | '4bit' | '8bit'
    flashAttention: boolean
  }
  
  // Training parameters
  training: {
    method: 'full' | 'lora' | 'qlora'
    epochs: number
    batchSize: number
    learningRate: number
    warmupSteps: number
    gradientAccumulation: number
    loraRank?: number
    loraAlpha?: number
    loraDropout?: number
  }
  
  // Hardware optimization
  hardware: {
    enableRTXOptimizations: boolean
    maxMemoryGB: number
    enableGradientCheckpointing: boolean
    enableMixedPrecision: boolean
    batchSizeStrategy: 'fixed' | 'dynamic' | 'adaptive'
    enableCompilation: boolean
  }
  
  // Data processing
  data: {
    includePrivateData: boolean
    minWordCount: number
    maxExamples: number
    prioritizeRecent: boolean
    dataQualityThreshold: number
  }
  
  // Quality assurance
  quality: {
    enableValidation: boolean
    validationSplit: number
    earlyStoppingPatience: number
    qualityMetrics: string[]
    benchmarkTests: string[]
  }
}

interface ModelInfo {
  id: string
  name: string
  architecture: string
  parameters: string
  contextLength: number
  memoryRequirement: number
  recommendedBatchSize: number
  supportedPrecisions: string[]
  description: string
  strengths: string[]
  limitations: string[]
}

interface TrainingTemplate {
  id: string
  name: string
  description: string
  useCase: string
  config: Partial<TrainingConfig>
  estimatedTime: number
  memoryRequirement: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'mistral-7b-instruct',
    name: 'Mistral 7B Instruct v0.2',
    architecture: 'mistral',
    parameters: '7B',
    contextLength: 8192,
    memoryRequirement: 18,
    recommendedBatchSize: 4,
    supportedPrecisions: ['fp16', 'bf16', '4bit'],
    description: 'Fast and efficient model optimized for instruction following',
    strengths: ['Fast training', 'Good instruction following', 'Memory efficient'],
    limitations: ['Limited context compared to newer models']
  },
  {
    id: 'llama2-7b-chat',
    name: 'Llama 2 7B Chat',
    architecture: 'llama',
    parameters: '7B',
    contextLength: 4096,
    memoryRequirement: 16,
    recommendedBatchSize: 4,
    supportedPrecisions: ['fp16', 'bf16', '4bit', '8bit'],
    description: 'Meta\'s conversational model with strong safety training',
    strengths: ['Excellent safety', 'Good conversational abilities', 'Well documented'],
    limitations: ['Shorter context length', 'More restrictive outputs']
  },
  {
    id: 'codellama-7b-instruct',
    name: 'CodeLlama 7B Instruct',
    architecture: 'llama',
    parameters: '7B',
    contextLength: 16384,
    memoryRequirement: 18,
    recommendedBatchSize: 3,
    supportedPrecisions: ['fp16', 'bf16', '4bit'],
    description: 'Specialized for code generation and programming tasks',
    strengths: ['Excellent code generation', 'Long context', 'Multi-language support'],
    limitations: ['Less suited for general conversation']
  },
  {
    id: 'phi-3-mini',
    name: 'Phi-3 Mini 3.8B',
    architecture: 'phi',
    parameters: '3.8B',
    contextLength: 4096,
    memoryRequirement: 8,
    recommendedBatchSize: 8,
    supportedPrecisions: ['fp16', 'bf16', '4bit'],
    description: 'Microsoft\'s compact yet capable model',
    strengths: ['Very memory efficient', 'Fast training', 'Good performance per parameter'],
    limitations: ['Smaller parameter count', 'Limited context']
  }
]

const TRAINING_TEMPLATES: TrainingTemplate[] = [
  {
    id: 'quick-personal',
    name: 'Quick Personal Assistant',
    description: 'Fast training optimized for quick results',
    useCase: 'Personal assistant with basic personalization',
    estimatedTime: 45,
    memoryRequirement: 16,
    difficulty: 'beginner',
    config: {
      model: {
        baseModel: 'mistral-7b-instruct',
        precision: 'bf16',
        quantization: '4bit',
        flashAttention: true
      },
      training: {
        method: 'lora',
        epochs: 2,
        batchSize: 4,
        learningRate: 2e-4,
        loraRank: 8,
        loraAlpha: 16
      },
      hardware: {
        enableRTXOptimizations: true,
        batchSizeStrategy: 'adaptive'
      }
    }
  },
  {
    id: 'high-quality-personal',
    name: 'High-Quality Personal Model',
    description: 'Comprehensive training for best personalization',
    useCase: 'Highly personalized AI with deep understanding',
    estimatedTime: 120,
    memoryRequirement: 20,
    difficulty: 'intermediate',
    config: {
      model: {
        baseModel: 'mistral-7b-instruct',
        precision: 'bf16',
        quantization: 'none',
        flashAttention: true
      },
      training: {
        method: 'lora',
        epochs: 4,
        batchSize: 6,
        learningRate: 1e-4,
        loraRank: 16,
        loraAlpha: 32
      },
      quality: {
        enableValidation: true,
        qualityMetrics: ['coherence', 'persona_match', 'factual_accuracy']
      }
    }
  },
  {
    id: 'memory-efficient',
    name: 'Memory Efficient Training',
    description: 'Optimized for systems with limited GPU memory',
    useCase: 'Training on constrained hardware',
    estimatedTime: 90,
    memoryRequirement: 12,
    difficulty: 'intermediate',
    config: {
      model: {
        baseModel: 'phi-3-mini',
        precision: 'fp16',
        quantization: '4bit',
        flashAttention: true
      },
      training: {
        method: 'qlora',
        epochs: 3,
        batchSize: 2,
        learningRate: 5e-5,
        loraRank: 4,
        loraAlpha: 8
      },
      hardware: {
        enableGradientCheckpointing: true,
        maxMemoryGB: 12
      }
    }
  }
]

export default function AdminTrainingConfigurator({ 
  onConfigurationComplete,
  initialUserId,
  initialUserData 
}: {
  onConfigurationComplete?: (config: TrainingConfig, userId?: string) => void
  initialUserId?: string
  initialUserData?: any
}) {
  const [config, setConfig] = useState<TrainingConfig>({
    model: {
      baseModel: 'mistral-7b-instruct',
      architecture: 'mistral',
      contextLength: 8192,
      precision: 'bf16',
      quantization: '4bit',
      flashAttention: true
    },
    training: {
      method: 'lora',
      epochs: 3,
      batchSize: 4,
      learningRate: 2e-4,
      warmupSteps: 100,
      gradientAccumulation: 2,
      loraRank: 16,
      loraAlpha: 32,
      loraDropout: 0.1
    },
    hardware: {
      enableRTXOptimizations: true,
      maxMemoryGB: 22,
      enableGradientCheckpointing: true,
      enableMixedPrecision: true,
      batchSizeStrategy: 'adaptive',
      enableCompilation: true
    },
    data: {
      includePrivateData: false,
      minWordCount: 20,
      maxExamples: 1000,
      prioritizeRecent: true,
      dataQualityThreshold: 60
    },
    quality: {
      enableValidation: true,
      validationSplit: 0.1,
      earlyStoppingPatience: 3,
      qualityMetrics: ['coherence', 'persona_match'],
      benchmarkTests: ['conversation_quality', 'factual_consistency']
    }
  })

  const [selectedModel, setSelectedModel] = useState<ModelInfo>(AVAILABLE_MODELS[0])
  const [activeTab, setActiveTab] = useState('model')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<any>(null)
  const [estimatedSpecs, setEstimatedSpecs] = useState({
    trainingTime: 90,
    memoryUsage: 18,
    costEstimate: 3.50,
    qualityScore: 85
  })

  useEffect(() => {
    // Update estimated specs when config changes
    calculateEstimatedSpecs()
  }, [config, selectedModel])

  const calculateEstimatedSpecs = () => {
    // Calculate estimated training time
    const baseTime = selectedModel.parameters === '7B' ? 60 : 45
    const epochMultiplier = config.training.epochs
    const batchSizeMultiplier = Math.max(0.5, config.training.batchSize / 4)
    const methodMultiplier = config.training.method === 'full' ? 3 : 1
    
    const estimatedTime = Math.round(baseTime * epochMultiplier * batchSizeMultiplier * methodMultiplier)
    
    // Calculate memory usage
    const baseMemory = selectedModel.memoryRequirement
    const quantizationReduction = config.model.quantization === '4bit' ? 0.6 : config.model.quantization === '8bit' ? 0.8 : 1
    const gradientCheckpointingReduction = config.hardware.enableGradientCheckpointing ? 0.8 : 1
    
    const estimatedMemory = Math.round(baseMemory * quantizationReduction * gradientCheckpointingReduction)
    
    // Calculate cost estimate (based on time and GPU usage)
    const costPerMinute = 0.04 // Approximate cost per minute for RTX 5090
    const costEstimate = (estimatedTime * costPerMinute)
    
    // Calculate quality score estimate
    const baseQuality = 70
    const epochBonus = Math.min(20, config.training.epochs * 3)
    const methodBonus = config.training.method === 'full' ? 10 : config.training.method === 'lora' ? 5 : 0
    const validationBonus = config.quality.enableValidation ? 5 : 0
    
    const qualityScore = Math.min(100, baseQuality + epochBonus + methodBonus + validationBonus)
    
    setEstimatedSpecs({
      trainingTime: estimatedTime,
      memoryUsage: estimatedMemory,
      costEstimate: Number(costEstimate.toFixed(2)),
      qualityScore
    })
  }

  const applyTemplate = (template: TrainingTemplate) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      ...template.config,
      model: {
        ...prevConfig.model,
        ...template.config.model
      },
      training: {
        ...prevConfig.training,
        ...template.config.training
      },
      hardware: {
        ...prevConfig.hardware,
        ...template.config.hardware
      },
      quality: {
        ...prevConfig.quality,
        ...template.config.quality
      }
    }))
    
    // Update selected model if template specifies one
    if (template.config.model?.baseModel) {
      const model = AVAILABLE_MODELS.find(m => m.id === template.config.model?.baseModel)
      if (model) setSelectedModel(model)
    }
  }

  const validateConfiguration = async () => {
    setIsValidating(true)
    try {
      const response = await fetch('/api/admin/training/validate-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config, 
          userId: initialUserId,
          modelInfo: selectedModel 
        })
      })
      
      if (!response.ok) throw new Error('Validation failed')
      
      const results = await response.json()
      setValidationResults(results)
    } catch (error) {
      console.error('Configuration validation failed:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleStartTraining = () => {
    if (onConfigurationComplete) {
      onConfigurationComplete(config, initialUserId)
    }
  }

  const updateConfig = (section: keyof TrainingConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-blue-100 text-blue-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Training Configuration</h2>
        <p className="text-gray-600">Configure model training parameters and optimization settings</p>
        {initialUserData && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Training for:</strong> {initialUserData.name} ({initialUserData.email})
            </p>
            <p className="text-sm text-blue-700">
              Data available: {initialUserData.training?.totalExamples || 0} examples, 
              {' '}{Math.round((initialUserData.training?.totalWords || 0) / 1000)}k words
            </p>
          </div>
        )}
      </div>

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
          <CardDescription>Choose a pre-configured template to get started quickly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {TRAINING_TEMPLATES.map(template => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => applyTemplate(template)}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{template.name}</h4>
                      <Badge className={getDifficultyColor(template.difficulty)}>
                        {template.difficulty}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600">{template.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>⏱️ {template.estimatedTime}min</div>
                      <div>💾 {template.memoryRequirement}GB</div>
                    </div>
                    
                    <Button size="sm" className="w-full">Apply Template</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Configuration</CardTitle>
          <CardDescription>Fine-tune training parameters for optimal results</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="model">Model</TabsTrigger>
              <TabsTrigger value="training">Training</TabsTrigger>
              <TabsTrigger value="hardware">Hardware</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="quality">Quality</TabsTrigger>
            </TabsList>

            {/* Model Configuration */}
            <TabsContent value="model" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Base Model</Label>
                    <Select 
                      value={config.model.baseModel} 
                      onValueChange={(value) => {
                        const model = AVAILABLE_MODELS.find(m => m.id === value)
                        if (model) {
                          setSelectedModel(model)
                          updateConfig('model', 'baseModel', value)
                          updateConfig('model', 'architecture', model.architecture)
                          updateConfig('model', 'contextLength', model.contextLength)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name} ({model.parameters})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Precision</Label>
                    <Select 
                      value={config.model.precision} 
                      onValueChange={(value: any) => updateConfig('model', 'precision', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bf16">BFloat16 (Recommended)</SelectItem>
                        <SelectItem value="fp16">Float16</SelectItem>
                        <SelectItem value="fp32">Float32 (Slower)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Quantization</Label>
                    <Select 
                      value={config.model.quantization} 
                      onValueChange={(value: any) => updateConfig('model', 'quantization', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4bit">4-bit (Memory Efficient)</SelectItem>
                        <SelectItem value="8bit">8-bit (Balanced)</SelectItem>
                        <SelectItem value="none">No Quantization (Full Precision)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="flashAttention"
                      checked={config.model.flashAttention}
                      onChange={(e) => updateConfig('model', 'flashAttention', e.target.checked)}
                    />
                    <Label htmlFor="flashAttention">Enable Flash Attention 2</Label>
                  </div>
                </div>

                {/* Model Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">{selectedModel.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{selectedModel.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div><strong>Parameters:</strong> {selectedModel.parameters}</div>
                    <div><strong>Context Length:</strong> {selectedModel.contextLength.toLocaleString()}</div>
                    <div><strong>Memory Req:</strong> {selectedModel.memoryRequirement}GB</div>
                  </div>

                  <div className="mt-3">
                    <div className="text-sm font-medium text-green-600">Strengths:</div>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {selectedModel.strengths.map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Training Configuration */}
            <TabsContent value="training" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Training Method</Label>
                    <Select 
                      value={config.training.method} 
                      onValueChange={(value: any) => updateConfig('training', 'method', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lora">LoRA (Recommended)</SelectItem>
                        <SelectItem value="qlora">QLoRA (Memory Efficient)</SelectItem>
                        <SelectItem value="full">Full Fine-tuning (Slow)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Epochs</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={config.training.epochs}
                      onChange={(e) => updateConfig('training', 'epochs', parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      min="1"
                      max="16"
                      value={config.training.batchSize}
                      onChange={(e) => updateConfig('training', 'batchSize', parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>Learning Rate</Label>
                    <Select 
                      value={config.training.learningRate.toString()} 
                      onValueChange={(value) => updateConfig('training', 'learningRate', parseFloat(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.0001">1e-4 (Conservative)</SelectItem>
                        <SelectItem value="0.0002">2e-4 (Recommended)</SelectItem>
                        <SelectItem value="0.0005">5e-4 (Aggressive)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* LoRA Specific Settings */}
                {(config.training.method === 'lora' || config.training.method === 'qlora') && (
                  <div className="space-y-4">
                    <h4 className="font-medium">LoRA Settings</h4>
                    
                    <div>
                      <Label>LoRA Rank</Label>
                      <Select 
                        value={config.training.loraRank?.toString()} 
                        onValueChange={(value) => updateConfig('training', 'loraRank', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 (Memory Efficient)</SelectItem>
                          <SelectItem value="8">8 (Balanced)</SelectItem>
                          <SelectItem value="16">16 (Recommended)</SelectItem>
                          <SelectItem value="32">32 (High Quality)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>LoRA Alpha</Label>
                      <Input
                        type="number"
                        min="8"
                        max="64"
                        value={config.training.loraAlpha}
                        onChange={(e) => updateConfig('training', 'loraAlpha', parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <Label>LoRA Dropout</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.training.loraDropout}
                        onChange={(e) => updateConfig('training', 'loraDropout', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Hardware Configuration */}
            <TabsContent value="hardware" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="rtxOptimizations"
                      checked={config.hardware.enableRTXOptimizations}
                      onChange={(e) => updateConfig('hardware', 'enableRTXOptimizations', e.target.checked)}
                    />
                    <Label htmlFor="rtxOptimizations">Enable RTX 5090 Optimizations</Label>
                  </div>

                  <div>
                    <Label>Max Memory Usage (GB)</Label>
                    <Input
                      type="number"
                      min="8"
                      max="24"
                      value={config.hardware.maxMemoryGB}
                      onChange={(e) => updateConfig('hardware', 'maxMemoryGB', parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>Batch Size Strategy</Label>
                    <Select 
                      value={config.hardware.batchSizeStrategy} 
                      onValueChange={(value: any) => updateConfig('hardware', 'batchSizeStrategy', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="dynamic">Dynamic</SelectItem>
                        <SelectItem value="adaptive">Adaptive (Recommended)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="gradientCheckpointing"
                      checked={config.hardware.enableGradientCheckpointing}
                      onChange={(e) => updateConfig('hardware', 'enableGradientCheckpointing', e.target.checked)}
                    />
                    <Label htmlFor="gradientCheckpointing">Gradient Checkpointing</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="compilation"
                      checked={config.hardware.enableCompilation}
                      onChange={(e) => updateConfig('hardware', 'enableCompilation', e.target.checked)}
                    />
                    <Label htmlFor="compilation">Enable Model Compilation</Label>
                  </div>
                </div>

                {/* Hardware Recommendations */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Hardware Recommendations</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>GPU:</strong> RTX 5090 (24GB VRAM)</div>
                    <div><strong>System RAM:</strong> 32GB+ recommended</div>
                    <div><strong>Storage:</strong> NVMe SSD for model cache</div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-blue-50 rounded">
                    <div className="text-sm font-medium text-blue-800">Current Estimates:</div>
                    <div className="text-sm text-blue-700">
                      Memory Usage: {estimatedSpecs.memoryUsage}GB / 24GB
                    </div>
                    <div className="text-sm text-blue-700">
                      Training Time: ~{estimatedSpecs.trainingTime} minutes
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Data Configuration */}
            <TabsContent value="data" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includePrivate"
                      checked={config.data.includePrivateData}
                      onChange={(e) => updateConfig('data', 'includePrivateData', e.target.checked)}
                    />
                    <Label htmlFor="includePrivate">Include Private Data</Label>
                  </div>

                  <div>
                    <Label>Minimum Word Count</Label>
                    <Input
                      type="number"
                      min="10"
                      max="100"
                      value={config.data.minWordCount}
                      onChange={(e) => updateConfig('data', 'minWordCount', parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>Maximum Examples</Label>
                    <Input
                      type="number"
                      min="100"
                      max="5000"
                      value={config.data.maxExamples}
                      onChange={(e) => updateConfig('data', 'maxExamples', parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>Data Quality Threshold (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={config.data.dataQualityThreshold}
                      onChange={(e) => updateConfig('data', 'dataQualityThreshold', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="prioritizeRecent"
                      checked={config.data.prioritizeRecent}
                      onChange={(e) => updateConfig('data', 'prioritizeRecent', e.target.checked)}
                    />
                    <Label htmlFor="prioritizeRecent">Prioritize Recent Data</Label>
                  </div>
                </div>

                {initialUserData && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Available Data</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Responses:</strong> {initialUserData.responses?.count || 0}</div>
                      <div><strong>Life Entries:</strong> {initialUserData.lifeEntries?.count || 0}</div>
                      <div><strong>Milestones:</strong> {initialUserData.milestones?.count || 0}</div>
                      <div><strong>Total Words:</strong> {(initialUserData.responses?.wordCount || 0) + (initialUserData.lifeEntries?.wordCount || 0) + (initialUserData.milestones?.wordCount || 0)}</div>
                      <div><strong>Quality Score:</strong> {initialUserData.responses?.qualityScore || 0}%</div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Quality Configuration */}
            <TabsContent value="quality" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableValidation"
                      checked={config.quality.enableValidation}
                      onChange={(e) => updateConfig('quality', 'enableValidation', e.target.checked)}
                    />
                    <Label htmlFor="enableValidation">Enable Validation</Label>
                  </div>

                  <div>
                    <Label>Validation Split</Label>
                    <Input
                      type="number"
                      min="0.05"
                      max="0.3"
                      step="0.05"
                      value={config.quality.validationSplit}
                      onChange={(e) => updateConfig('quality', 'validationSplit', parseFloat(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>Early Stopping Patience</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={config.quality.earlyStoppingPatience}
                      onChange={(e) => updateConfig('quality', 'earlyStoppingPatience', parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>Quality Metrics</Label>
                    <div className="space-y-2">
                      {['coherence', 'persona_match', 'factual_accuracy', 'emotional_consistency'].map(metric => (
                        <div key={metric} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={metric}
                            checked={config.quality.qualityMetrics.includes(metric)}
                            onChange={(e) => {
                              const metrics = e.target.checked
                                ? [...config.quality.qualityMetrics, metric]
                                : config.quality.qualityMetrics.filter(m => m !== metric)
                              updateConfig('quality', 'qualityMetrics', metrics)
                            }}
                          />
                          <Label htmlFor={metric}>{metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Quality Assurance</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Validation:</strong> {config.quality.enableValidation ? 'Enabled' : 'Disabled'}</div>
                    <div><strong>Metrics:</strong> {config.quality.qualityMetrics.length} selected</div>
                    <div><strong>Expected Quality:</strong> {estimatedSpecs.qualityScore}%</div>
                  </div>
                  
                  {config.quality.enableValidation && (
                    <div className="mt-3 p-3 bg-green-50 rounded">
                      <div className="text-sm text-green-800">
                        Validation will use {Math.round(config.quality.validationSplit * 100)}% of data for testing
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Estimated Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Training Estimates</CardTitle>
          <CardDescription>Expected performance and resource usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{estimatedSpecs.trainingTime}min</div>
              <div className="text-sm text-gray-600">Training Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{estimatedSpecs.memoryUsage}GB</div>
              <div className="text-sm text-gray-600">GPU Memory</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">${estimatedSpecs.costEstimate}</div>
              <div className="text-sm text-gray-600">Est. Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{estimatedSpecs.qualityScore}%</div>
              <div className="text-sm text-gray-600">Quality Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={validateConfiguration} disabled={isValidating}>
          {isValidating ? 'Validating...' : 'Validate Configuration'}
        </Button>
        
        <Button onClick={handleStartTraining} className="bg-blue-600 hover:bg-blue-700">
          Start Training
        </Button>
      </div>

      {/* Validation Results */}
      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validationResults.warnings?.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-600">Warnings:</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {validationResults.warnings.map((warning: string, idx: number) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validationResults.errors?.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600">Errors:</h4>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {validationResults.errors.map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validationResults.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-600">Recommendations:</h4>
                  <ul className="list-disc list-inside text-sm text-blue-700">
                    {validationResults.recommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}