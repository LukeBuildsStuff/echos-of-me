/**
 * AI Training Pipeline Configuration
 * 
 * This system manages the weekly training of personalized AI models
 * based on user responses to legacy preservation questions.
 */

export interface TrainingConfig {
  // Model Configuration
  model: {
    baseModel: string
    architecture: 'mistral' | 'llama' | 'custom'
    parameters: string // 7B, 13B, etc
    contextLength: number
    device: 'cuda' | 'cpu'
  }
  
  // Training Schedule
  schedule: {
    frequency: 'weekly' | 'biweekly' | 'monthly'
    dayOfWeek: number // 0 = Sunday
    hourUTC: number // 24-hour format
    minResponsesRequired: number // Minimum responses before first training
    incrementalTraining: boolean // Continue training existing model vs fresh
  }
  
  // Data Requirements
  dataRequirements: {
    minResponses: number
    minWordCount: number
    minQuestionCategories: number
    validationSplit: number // Percentage for validation
  }
  
  // Training Parameters
  training: {
    method: 'full' | 'lora' | 'qlora'
    epochs: number
    batchSize: number
    learningRate: number
    warmupSteps: number
    gradientCheckpointing: boolean
    fp16: boolean
    loraRank?: number
    loraAlpha?: number
  }
  
  // Response Processing
  responseProcessing: {
    includeQuestionContext: boolean
    preserveEmotionalTone: boolean
    augmentWithMetadata: boolean // Include relationship, dates, etc
    filterShortResponses: boolean
    minResponseLength: number
  }
  
  // Quality Assurance
  qualityChecks: {
    evaluateCoherence: boolean
    evaluatePersonaMatch: boolean
    humanReviewRequired: boolean
    confidenceThreshold: number
  }
  
  // Deployment
  deployment: {
    autoDeployAfterTraining: boolean
    keepPreviousVersions: number
    rollbackOnFailure: boolean
    testQuestionsRequired: string[] // Questions to validate model
  }
}

export const defaultTrainingConfig: TrainingConfig = {
  model: {
    baseModel: 'mistralai/Mistral-7B-Instruct-v0.2',
    architecture: 'mistral',
    parameters: '7B',
    contextLength: 8192,
    device: 'cuda'
  },
  
  schedule: {
    frequency: 'weekly',
    dayOfWeek: 0, // Sunday
    hourUTC: 3, // 3 AM UTC
    minResponsesRequired: 50,
    incrementalTraining: true
  },
  
  dataRequirements: {
    minResponses: 50,
    minWordCount: 5000,
    minQuestionCategories: 5,
    validationSplit: 0.1
  },
  
  training: {
    method: 'lora', // Efficient for weekly updates
    epochs: 3,
    batchSize: 4,
    learningRate: 2e-5,
    warmupSteps: 100,
    gradientCheckpointing: true,
    fp16: true,
    loraRank: 16,
    loraAlpha: 32
  },
  
  responseProcessing: {
    includeQuestionContext: true,
    preserveEmotionalTone: true,
    augmentWithMetadata: true,
    filterShortResponses: true,
    minResponseLength: 20 // words
  },
  
  qualityChecks: {
    evaluateCoherence: true,
    evaluatePersonaMatch: true,
    humanReviewRequired: false, // Auto-deploy for MVP
    confidenceThreshold: 0.8
  },
  
  deployment: {
    autoDeployAfterTraining: true,
    keepPreviousVersions: 3,
    rollbackOnFailure: true,
    testQuestionsRequired: [
      "What's your favorite memory with your family?",
      "What advice would you give to your children?",
      "Tell me about a time you were proud of someone you love."
    ]
  }
}

/**
 * Training Data Format
 * Each training example follows this structure
 */
export interface TrainingExample {
  instruction: string // The question asked
  input: string // Additional context (relationship, occasion, etc)
  output: string // The user's response
  metadata: {
    userId: string
    timestamp: Date
    questionCategory: string
    responseWordCount: number
    emotionalTone?: string
    importantPeople?: string[]
  }
}

/**
 * Model Versioning
 * Track all trained models for rollback/comparison
 */
export interface ModelVersion {
  id: string
  userId: string
  version: number
  trainedAt: Date
  baseModel: string
  trainingExamples: number
  performance: {
    loss: number
    validationLoss: number
    coherenceScore: number
    personaMatchScore: number
  }
  status: 'training' | 'validating' | 'deployed' | 'archived'
  checkpointPath: string
  config: TrainingConfig
}