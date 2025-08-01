// RTX 5090 Hybrid Architecture Configuration
// This manages the connection between cloud-deployed Next.js and local RTX 5090

interface RTXConfig {
  enabled: boolean
  endpoints: {
    training: string
    inference: string
    voice: string
    monitor: string
  }
  fallback: {
    enabled: boolean
    cloudEndpoint: string
  }
  timeout: {
    training: number
    inference: number
    voice: number
  }
  retryPolicy: {
    maxRetries: number
    backoffMultiplier: number
    initialDelay: number
  }
}

class RTXHybridManager {
  private config: RTXConfig
  private connectionStatus: Map<string, boolean> = new Map()
  private lastHealthCheck: Map<string, number> = new Map()
  private healthCheckInterval = 30000 // 30 seconds

  constructor() {
    this.config = {
      enabled: process.env.ENABLE_RTX_FALLBACK === 'true',
      endpoints: {
        training: process.env.RTX_GPU_ENDPOINT || 'http://localhost:8000',
        inference: process.env.RTX_INFERENCE_ENDPOINT || 'http://localhost:8001',
        voice: process.env.RTX_VOICE_ENDPOINT || 'http://localhost:8002',
        monitor: process.env.RTX_MONITOR_ENDPOINT || 'http://localhost:9000'
      },
      fallback: {
        enabled: true,
        cloudEndpoint: process.env.ML_INFERENCE_URL || 'https://api.openai.com/v1'
      },
      timeout: {
        training: 300000, // 5 minutes for training operations
        inference: 30000, // 30 seconds for inference
        voice: 60000     // 1 minute for voice processing
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      }
    }

    // Initialize connection monitoring
    this.initializeHealthChecks()
  }

  private async initializeHealthChecks(): Promise<void> {
    if (!this.config.enabled) return

    // Check all RTX endpoints periodically
    setInterval(() => {
      this.performHealthChecks()
    }, this.healthCheckInterval)

    // Initial health check
    await this.performHealthChecks()
  }

  private async performHealthChecks(): Promise<void> {
    const endpoints = Object.entries(this.config.endpoints)
    
    for (const [service, endpoint] of endpoints) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(`${endpoint}/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'EchosOfMe-RTX-Client/1.0'
          }
        })

        clearTimeout(timeoutId)
        
        const isHealthy = response.ok
        this.connectionStatus.set(service, isHealthy)
        this.lastHealthCheck.set(service, Date.now())

        if (isHealthy) {
          console.log(`✅ RTX ${service} service is healthy`)
        } else {
          console.warn(`⚠️ RTX ${service} service returned status ${response.status}`)
        }
      } catch (error) {
        this.connectionStatus.set(service, false)
        this.lastHealthCheck.set(service, Date.now())
        console.error(`❌ RTX ${service} health check failed:`, error)
      }
    }
  }

  // Check if RTX service is available
  public isRTXAvailable(service: keyof RTXConfig['endpoints']): boolean {
    if (!this.config.enabled) return false
    return this.connectionStatus.get(service) === true
  }

  // Get the appropriate endpoint (RTX or fallback)
  public getEndpoint(service: keyof RTXConfig['endpoints']): string {
    if (this.isRTXAvailable(service)) {
      return this.config.endpoints[service]
    }
    
    if (this.config.fallback.enabled) {
      console.log(`🔄 Using fallback endpoint for ${service} service`)
      return this.config.fallback.cloudEndpoint
    }
    
    throw new Error(`RTX ${service} service unavailable and no fallback configured`)
  }

  // Make request with automatic fallback
  public async makeRequest(
    service: keyof RTXConfig['endpoints'],
    path: string,
    options: RequestInit = {},
    useRTXOnly: boolean = false
  ): Promise<Response> {
    const timeoutMs = this.config.timeout[service] || 30000
    
    // Try RTX first if available
    if (this.isRTXAvailable(service)) {
      try {
        return await this.executeRequest(
          `${this.config.endpoints[service]}${path}`,
          options,
          timeoutMs
        )
      } catch (error) {
        console.error(`RTX ${service} request failed:`, error)
        
        // Mark service as unavailable
        this.connectionStatus.set(service, false)
        
        // Don't fallback if RTX-only mode requested
        if (useRTXOnly) {
          throw new Error(`RTX ${service} unavailable and RTX-only mode requested`)
        }
      }
    }

    // Fallback to cloud service
    if (this.config.fallback.enabled && !useRTXOnly) {
      console.log(`🔄 Falling back to cloud service for ${service}`)
      return await this.executeRequest(
        `${this.config.fallback.cloudEndpoint}${path}`,
        options,
        timeoutMs
      )
    }

    throw new Error(`No available endpoint for ${service} service`)
  }

  private async executeRequest(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EchosOfMe-RTX-Client/1.0',
          ...options.headers
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // Training-specific methods
  public async startTraining(trainingData: any, useRTXOnly: boolean = true): Promise<any> {
    const response = await this.makeRequest(
      'training',
      '/api/training/start',
      {
        method: 'POST',
        body: JSON.stringify(trainingData)
      },
      useRTXOnly
    )

    return await response.json()
  }

  public async getTrainingStatus(jobId: string): Promise<any> {
    const response = await this.makeRequest(
      'training',
      `/api/training/status/${jobId}`,
      { method: 'GET' }
    )

    return await response.json()
  }

  // Inference methods
  public async runInference(inputData: any): Promise<any> {
    const response = await this.makeRequest(
      'inference',
      '/api/inference',
      {
        method: 'POST',
        body: JSON.stringify(inputData)
      }
    )

    return await response.json()
  }

  // Voice processing methods
  public async processVoice(audioData: any, processingType: string): Promise<any> {
    const response = await this.makeRequest(
      'voice',
      `/api/voice/${processingType}`,
      {
        method: 'POST',
        body: JSON.stringify(audioData)
      }
    )

    return await response.json()
  }

  // Get comprehensive status
  public getSystemStatus(): {
    rtxEnabled: boolean
    services: Record<string, {
      available: boolean
      endpoint: string
      lastCheck: number
      status: string
    }>
    fallbackEnabled: boolean
  } {
    const services: Record<string, any> = {}
    
    for (const [name, endpoint] of Object.entries(this.config.endpoints)) {
      const available = this.connectionStatus.get(name) === true
      const lastCheck = this.lastHealthCheck.get(name) || 0
      
      services[name] = {
        available,
        endpoint,
        lastCheck,
        status: available ? 'healthy' : 'unavailable'
      }
    }

    return {
      rtxEnabled: this.config.enabled,
      services,
      fallbackEnabled: this.config.fallback.enabled
    }
  }

  // Manual service refresh
  public async refreshServiceStatus(): Promise<void> {
    await this.performHealthChecks()
  }

  // Update configuration (useful for dynamic updates)
  public updateConfig(newConfig: Partial<RTXConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('RTX configuration updated:', newConfig)
  }
}

// Export singleton instance
export const rtxHybrid = new RTXHybridManager()

// Export types and utilities
export type { RTXConfig }
export { RTXHybridManager }

// Utility functions for common operations
export async function checkRTXHealth(): Promise<{
  healthy: boolean
  services: string[]
  unavailable: string[]
  details: any
}> {
  const status = rtxHybrid.getSystemStatus()
  const services = Object.keys(status.services)
  const availableServices = services.filter(s => status.services[s].available)
  const unavailableServices = services.filter(s => !status.services[s].available)

  return {
    healthy: availableServices.length > 0,
    services: availableServices,
    unavailable: unavailableServices,
    details: status
  }
}

export async function trainWithRTX(trainingData: any, requireRTX: boolean = true): Promise<any> {
  try {
    return await rtxHybrid.startTraining(trainingData, requireRTX)
  } catch (error) {
    if (requireRTX) {
      throw new Error(`RTX training failed: ${error}`)
    }
    
    // Try cloud fallback
    console.log('🔄 Attempting cloud-based training fallback')
    throw new Error('Cloud training fallback not implemented yet')
  }
}

export async function inferenceWithRTX(inputData: any): Promise<any> {
  return await rtxHybrid.runInference(inputData)
}

export async function processVoiceWithRTX(audioData: any, type: string = 'clone'): Promise<any> {
  return await rtxHybrid.processVoice(audioData, type)
}