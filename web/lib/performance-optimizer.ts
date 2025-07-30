/**
 * Performance Optimization for RTX 5090 LLM Training
 * 
 * Comprehensive performance tuning and monitoring for the training pipeline
 * Optimized for RTX 5090 with 24GB GDDR6X memory
 */

import { TrainingConfig, defaultTrainingConfig } from './ai-training-config'
import { spawn } from 'child_process'

export interface PerformanceMetrics {
  gpuUtilization: number
  memoryUsage: number
  throughput: number // tokens/second
  powerConsumption: number // watts
  temperature: number // celsius
  trainingSpeed: number // examples/minute
  costEfficiency: number // performance/dollar
}

export interface OptimizationRecommendation {
  category: 'memory' | 'compute' | 'io' | 'configuration'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  implementation: string
  expectedGain: string
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer
  private metrics: PerformanceMetrics[] = []
  private monitoring = false

  private constructor() {}

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer()
    }
    return PerformanceOptimizer.instance
  }

  /**
   * Optimize training configuration for RTX 5090
   */
  optimizeTrainingConfig(baseConfig: TrainingConfig, datasetSize: number): TrainingConfig {
    const optimizedConfig = { ...baseConfig }

    // Memory optimization
    const availableMemory = 24 // RTX 5090 memory in GB
    const estimatedMemoryUsage = this.estimateMemoryUsage(datasetSize, baseConfig)
    
    if (estimatedMemoryUsage > availableMemory * 0.9) {
      // Reduce batch size if memory is tight
      optimizedConfig.training.batchSize = Math.max(1, Math.floor(baseConfig.training.batchSize * 0.7))
      optimizedConfig.training.gradientCheckpointing = true
      optimizedConfig.model.quantization = '4bit'
    }

    // Compute optimization
    optimizedConfig.hardware = {
      ...baseConfig.hardware,
      gpuMemoryGB: availableMemory,
      tensorCores: true,
      flashAttention: true,
      memoryOptimization: estimatedMemoryUsage > availableMemory * 0.8 ? 'aggressive' : 'balanced'
    }

    // Training parameters optimization
    if (datasetSize < 100) {
      // Small dataset: more epochs, lower learning rate
      optimizedConfig.training.epochs = Math.min(5, optimizedConfig.training.epochs + 1)
      optimizedConfig.training.learningRate *= 0.8
    } else if (datasetSize > 500) {
      // Large dataset: fewer epochs, higher learning rate
      optimizedConfig.training.epochs = Math.max(2, optimizedConfig.training.epochs - 1)
      optimizedConfig.training.learningRate *= 1.2
    }

    // Model architecture optimization
    if (optimizedConfig.model.architecture === 'mistral' && datasetSize > 200) {
      // Enable advanced optimizations for larger datasets
      optimizedConfig.model.precision = 'bf16' // Better than fp16 for RTX 5090
      optimizedConfig.training.method = 'lora' // More efficient than full fine-tuning
    }

    return optimizedConfig
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.monitoring) return

    this.monitoring = true
    const monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics()
        this.metrics.push(metrics)
        
        // Keep only last 100 metrics
        if (this.metrics.length > 100) {
          this.metrics = this.metrics.slice(-100)
        }

        // Check for performance issues
        this.analyzePerformance(metrics)
      } catch (error) {
        console.error('Performance monitoring error:', error)
      }
    }, 5000) // Collect metrics every 5 seconds

    // Stop monitoring after 2 hours
    setTimeout(() => {
      clearInterval(monitoringInterval)
      this.monitoring = false
    }, 2 * 60 * 60 * 1000)
  }

  /**
   * Get current performance metrics
   */
  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    return await this.collectMetrics()
  }

  /**
   * Get performance recommendations
   */
  async getOptimizationRecommendations(config: TrainingConfig): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []
    const currentMetrics = await this.collectMetrics()

    // GPU utilization recommendations
    if (currentMetrics.gpuUtilization < 80) {
      recommendations.push({
        category: 'compute',
        priority: 'high',
        title: 'Increase GPU Utilization',
        description: `GPU utilization is only ${currentMetrics.gpuUtilization}%. Consider increasing batch size or model complexity.`,
        implementation: 'Increase training.batchSize or reduce gradient accumulation steps',
        expectedGain: '15-25% faster training'
      })
    }

    // Memory utilization recommendations
    if (currentMetrics.memoryUsage < 16) {
      recommendations.push({
        category: 'memory',
        priority: 'medium',
        title: 'Utilize More GPU Memory',
        description: `Only using ${currentMetrics.memoryUsage}GB of 24GB available. You can increase model size or batch size.`,
        implementation: 'Increase batch size or use a larger base model',
        expectedGain: '10-20% better model quality'
      })
    } else if (currentMetrics.memoryUsage > 22) {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        title: 'Memory Usage Too High',
        description: `Using ${currentMetrics.memoryUsage}GB of 24GB. Risk of out-of-memory errors.`,
        implementation: 'Enable gradient checkpointing or reduce batch size',
        expectedGain: 'Prevent OOM errors'
      })
    }

    // Training speed recommendations
    if (currentMetrics.trainingSpeed < 50) {
      recommendations.push({
        category: 'configuration',
        priority: 'medium',
        title: 'Optimize Training Speed',
        description: `Training speed is ${currentMetrics.trainingSpeed} examples/minute. This is below optimal.`,
        implementation: 'Enable mixed precision (bf16), use flash attention, or optimize data loading',
        expectedGain: '20-40% faster training'
      })
    }

    // Temperature recommendations
    if (currentMetrics.temperature > 80) {
      recommendations.push({
        category: 'compute',
        priority: 'high',
        title: 'GPU Temperature Too High',
        description: `GPU temperature is ${currentMetrics.temperature}°C. This may cause thermal throttling.`,
        implementation: 'Improve cooling, reduce power limit, or lower batch size',
        expectedGain: 'Prevent performance degradation'
      })
    }

    // Cost efficiency recommendations
    if (currentMetrics.costEfficiency < 0.5) {
      recommendations.push({
        category: 'configuration',
        priority: 'low',
        title: 'Improve Cost Efficiency',
        description: 'Training could be more cost-effective with better resource utilization.',
        implementation: 'Optimize hyperparameters for faster convergence',
        expectedGain: '10-30% cost reduction'
      })
    }

    // Configuration-specific recommendations
    if (config.model.quantization === 'none') {
      recommendations.push({
        category: 'configuration',
        priority: 'medium',
        title: 'Enable Model Quantization',
        description: 'Using full precision. Quantization can significantly reduce memory usage.',
        implementation: 'Set model.quantization to "4bit" or "8bit"',
        expectedGain: '40-60% memory reduction'
      })
    }

    if (!config.hardware.flashAttention) {
      recommendations.push({
        category: 'configuration',
        priority: 'medium',
        title: 'Enable Flash Attention',
        description: 'Flash Attention can significantly improve memory efficiency and speed.',
        implementation: 'Set hardware.flashAttention to true',
        expectedGain: '20-30% memory reduction, 10-15% speed improvement'
      })
    }

    return recommendations
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    summary: any
    metrics: PerformanceMetrics[]
    recommendations: string[]
  } {
    if (this.metrics.length === 0) {
      return {
        summary: { message: 'No performance data available' },
        metrics: [],
        recommendations: ['Start training to collect performance data']
      }
    }

    const latestMetrics = this.metrics[this.metrics.length - 1]
    const averageMetrics = this.calculateAverageMetrics()

    const summary = {
      currentGPUUtilization: `${latestMetrics.gpuUtilization}%`,
      averageGPUUtilization: `${averageMetrics.gpuUtilization.toFixed(1)}%`,
      currentMemoryUsage: `${latestMetrics.memoryUsage}GB / 24GB`,
      averageMemoryUsage: `${averageMetrics.memoryUsage.toFixed(1)}GB / 24GB`,
      currentThroughput: `${latestMetrics.throughput} tokens/sec`,
      averageThroughput: `${averageMetrics.throughput.toFixed(1)} tokens/sec`,
      currentTemperature: `${latestMetrics.temperature}°C`,
      averageTemperature: `${averageMetrics.temperature.toFixed(1)}°C`,
      trainingSpeed: `${latestMetrics.trainingSpeed} examples/min`,
      costEfficiency: averageMetrics.costEfficiency.toFixed(2)
    }

    const recommendations = this.generateGeneralRecommendations(averageMetrics)

    return {
      summary,
      metrics: this.metrics,
      recommendations
    }
  }

  // Private helper methods

  private async collectMetrics(): Promise<PerformanceMetrics> {
    // In production, this would query actual GPU metrics
    // For demonstration, we'll simulate realistic metrics
    return {
      gpuUtilization: 75 + Math.random() * 20, // 75-95%
      memoryUsage: 18 + Math.random() * 4, // 18-22GB
      throughput: 400 + Math.random() * 200, // 400-600 tokens/sec
      powerConsumption: 350 + Math.random() * 100, // 350-450W
      temperature: 65 + Math.random() * 15, // 65-80°C
      trainingSpeed: 80 + Math.random() * 40, // 80-120 examples/min
      costEfficiency: 0.6 + Math.random() * 0.4 // 0.6-1.0
    }
  }

  private estimateMemoryUsage(datasetSize: number, config: TrainingConfig): number {
    // Rough estimation based on model size and training parameters
    const baseModelMemory = 14 // 7B model in fp16 ≈ 14GB
    const batchMemory = config.training.batchSize * 0.5 // ~0.5GB per batch item
    const optimizerMemory = baseModelMemory * 0.5 // Optimizer states
    const activationMemory = config.training.gradientCheckpointing ? 2 : 4
    
    let totalMemory = baseModelMemory + batchMemory + optimizerMemory + activationMemory

    // Adjust for quantization
    if (config.model.quantization === '4bit') {
      totalMemory *= 0.5
    } else if (config.model.quantization === '8bit') {
      totalMemory *= 0.75
    }

    return totalMemory
  }

  private analyzePerformance(metrics: PerformanceMetrics): void {
    // Real-time performance analysis
    if (metrics.gpuUtilization < 60) {
      console.warn('Low GPU utilization detected:', metrics.gpuUtilization + '%')
    }

    if (metrics.temperature > 85) {
      console.warn('High GPU temperature detected:', metrics.temperature + '°C')
    }

    if (metrics.memoryUsage > 23) {
      console.warn('High memory usage detected:', metrics.memoryUsage + 'GB')
    }
  }

  private calculateAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        gpuUtilization: 0,
        memoryUsage: 0,
        throughput: 0,
        powerConsumption: 0,
        temperature: 0,
        trainingSpeed: 0,
        costEfficiency: 0
      }
    }

    const sum = this.metrics.reduce((acc, metric) => ({
      gpuUtilization: acc.gpuUtilization + metric.gpuUtilization,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      throughput: acc.throughput + metric.throughput,
      powerConsumption: acc.powerConsumption + metric.powerConsumption,
      temperature: acc.temperature + metric.temperature,
      trainingSpeed: acc.trainingSpeed + metric.trainingSpeed,
      costEfficiency: acc.costEfficiency + metric.costEfficiency
    }), {
      gpuUtilization: 0,
      memoryUsage: 0,
      throughput: 0,
      powerConsumption: 0,
      temperature: 0,
      trainingSpeed: 0,
      costEfficiency: 0
    })

    const count = this.metrics.length
    return {
      gpuUtilization: sum.gpuUtilization / count,
      memoryUsage: sum.memoryUsage / count,
      throughput: sum.throughput / count,
      powerConsumption: sum.powerConsumption / count,
      temperature: sum.temperature / count,
      trainingSpeed: sum.trainingSpeed / count,
      costEfficiency: sum.costEfficiency / count
    }
  }

  private generateGeneralRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = []

    if (metrics.gpuUtilization < 70) {
      recommendations.push('Consider increasing batch size to improve GPU utilization')
    }

    if (metrics.memoryUsage < 16) {
      recommendations.push('You have unused GPU memory - consider using a larger model or batch size')
    }

    if (metrics.temperature > 75) {
      recommendations.push('Monitor GPU temperature - consider improving cooling or reducing power')
    }

    if (metrics.trainingSpeed < 60) {
      recommendations.push('Training speed is below optimal - check for bottlenecks in data loading or model architecture')
    }

    if (metrics.costEfficiency < 0.7) {
      recommendations.push('Consider optimizing hyperparameters for better cost efficiency')
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! Current configuration is well-optimized.')
    }

    return recommendations
  }

  /**
   * Get RTX 5090 specific optimizations
   */
  getRTX5090Optimizations(): {
    title: string
    optimizations: Array<{
      setting: string
      value: string
      reason: string
    }>
  } {
    return {
      title: 'RTX 5090 Specific Optimizations',
      optimizations: [
        {
          setting: 'Tensor Core Usage',
          value: 'Enabled (Mixed Precision)',
          reason: 'RTX 5090 4th gen Tensor Cores provide massive speedup for AI training'
        },
        {
          setting: 'Memory Type',
          value: 'GDDR6X (24GB)',
          reason: 'High bandwidth memory perfect for large model training'
        },
        {
          setting: 'Flash Attention',
          value: 'Enabled',
          reason: 'Reduces memory usage and improves speed on modern architectures'
        },
        {
          setting: 'Precision Mode',
          value: 'bfloat16',
          reason: 'Better numerical stability than fp16 on RTX 5090'
        },
        {
          setting: 'Quantization',
          value: '4-bit (QLoRA)',
          reason: 'Allows training larger models within 24GB memory limit'
        },
        {
          setting: 'Gradient Checkpointing',
          value: 'Enabled',
          reason: 'Trades compute for memory, essential for large models'
        },
        {
          setting: 'Batch Size',
          value: 'Dynamic (4-8)',
          reason: 'Optimized based on available memory and model size'
        },
        {
          setting: 'Learning Rate',
          value: '2e-5 to 5e-5',
          reason: 'Optimal range for stable training with LoRA adapters'
        }
      ]
    }
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance()