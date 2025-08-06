const fetch = require('node-fetch');
const winston = require('winston');
const { EventEmitter } = require('events');

/**
 * AI Service for RTX 5090 Integration
 * Handles communication with the local RTX 5090 AI model at localhost:8000
 * Provides fallback responses and connection management
 */
class AIService extends EventEmitter {
  constructor() {
    super();
    
    // Configuration
    this.rtxEndpoint = process.env.RTX_ENDPOINT || 'http://localhost:8000';
    this.maxRetries = 3;
    this.timeout = 30000; // 30 seconds
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerWindow = 60000; // 1 minute
    
    // Circuit breaker state
    this.circuitBreaker = {
      failures: 0,
      lastFailure: null,
      state: 'closed' // closed, open, half-open
    };
    
    // Health monitoring
    this.healthStatus = {
      isHealthy: false,
      lastCheck: null,
      consecutiveFailures: 0
    };
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    winston.info('AI Service initialized', { 
      endpoint: this.rtxEndpoint,
      timeout: this.timeout 
    });
  }

  /**
   * Chat with the RTX 5090 AI model
   */
  async chatWithAI(message, userId, options = {}) {
    const {
      context = [],
      temperature = 0.7,
      maxTokens = 512,
      sessionId = null
    } = options;

    // Check circuit breaker
    if (this.circuitBreaker.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailure;
      if (timeSinceLastFailure < this.circuitBreakerWindow) {
        winston.warn('Circuit breaker is open, using fallback response');
        return this.getFallbackResponse(message, userId);
      } else {
        // Try to half-open the circuit
        this.circuitBreaker.state = 'half-open';
        winston.info('Circuit breaker transitioning to half-open');
      }
    }

    const payload = {
      message: message.trim(),
      user_id: userId,
      context: context.slice(-10), // Last 10 messages for context
      temperature,
      max_tokens: maxTokens,
      session_id: sessionId
    };

    winston.info('Sending message to RTX 5090', {
      userId,
      messageLength: message.length,
      contextMessages: context.length
    });

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        
        const response = await fetch(`${this.rtxEndpoint}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Personal-AI-Clone/1.0'
          },
          body: JSON.stringify(payload),
          timeout: this.timeout
        });

        if (!response.ok) {
          throw new Error(`RTX 5090 responded with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const responseTime = Date.now() - startTime;

        // Reset circuit breaker on success
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.state = 'closed';
        this.healthStatus.consecutiveFailures = 0;
        this.healthStatus.isHealthy = true;

        winston.info('RTX 5090 response received', {
          userId,
          responseTime,
          responseLength: data.response?.length || 0,
          confidence: data.confidence,
          attempt
        });

        // Emit success event
        this.emit('chatSuccess', {
          userId,
          responseTime,
          attempt,
          confidence: data.confidence
        });

        return {
          success: true,
          response: data.response,
          confidence: data.confidence || 0.9,
          responseTime,
          metadata: {
            modelVersion: data.model_version,
            tokensGenerated: data.tokens_generated,
            source: 'rtx5090',
            attempt
          }
        };

      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        winston.warn(`RTX 5090 attempt ${attempt} failed`, {
          userId,
          error: error.message,
          responseTime,
          attempt
        });

        // Track circuit breaker failures
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();
        this.healthStatus.consecutiveFailures++;
        
        // Open circuit breaker if threshold reached
        if (this.circuitBreaker.failures >= this.circuitBreakerThreshold) {
          this.circuitBreaker.state = 'open';
          winston.error('Circuit breaker opened due to repeated failures');
        }

        // If this is the last attempt, use fallback
        if (attempt === this.maxRetries) {
          winston.error('All RTX 5090 attempts failed, using fallback', {
            userId,
            error: error.message,
            totalAttempts: attempt
          });

          this.emit('chatFailure', {
            userId,
            error: error.message,
            attempts: attempt
          });

          return this.getFallbackResponse(message, userId, error);
        }

        // Exponential backoff
        await this.delay(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  /**
   * Get fallback response when RTX 5090 is unavailable
   */
  getFallbackResponse(message, userId, error = null) {
    const fallbackResponses = [
      "I'm having trouble connecting to my AI processing right now. Your message is important to me, and I'd love to give you a thoughtful response. Could you try again in a moment?",
      "It seems my AI processing is temporarily unavailable. I value our conversation and want to respond properly, so please check back shortly.",
      "I'm experiencing some technical difficulties with my AI system. Your question deserves a meaningful response, so please try again soon.",
      "My AI processing system is taking a brief rest. I appreciate your patience and would love to continue our conversation in just a moment.",
      "I'm having a temporary connection issue with my AI capabilities. Please try your message again - I'm looking forward to sharing my thoughts with you."
    ];

    const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    winston.info('Providing fallback response', {
      userId,
      isFallback: true,
      reason: error?.message || 'Service unavailable'
    });

    return {
      success: true,
      response: fallbackResponse,
      confidence: 0.3,
      responseTime: 100,
      metadata: {
        source: 'fallback',
        reason: error?.message || 'Service unavailable',
        isFallback: true
      }
    };
  }

  /**
   * Check RTX 5090 health status
   */
  async checkHealth() {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.rtxEndpoint}/health`, {
        method: 'GET',
        timeout: 5000 // Shorter timeout for health checks
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        
        this.healthStatus.isHealthy = true;
        this.healthStatus.lastCheck = new Date();
        this.healthStatus.consecutiveFailures = 0;

        return {
          status: 'healthy',
          responseTime,
          modelLoaded: data.model_loaded || false,
          gpuAvailable: data.gpu_available || false,
          gpuMemoryUsed: data.gpu_memory_gb || null,
          endpoint: this.rtxEndpoint
        };
      } else {
        throw new Error(`Health check failed with status ${response.status}`);
      }
    } catch (error) {
      this.healthStatus.isHealthy = false;
      this.healthStatus.lastCheck = new Date();
      this.healthStatus.consecutiveFailures++;

      winston.warn('RTX 5090 health check failed', {
        error: error.message,
        consecutiveFailures: this.healthStatus.consecutiveFailures
      });

      return {
        status: 'unhealthy',
        error: error.message,
        consecutiveFailures: this.healthStatus.consecutiveFailures,
        endpoint: this.rtxEndpoint
      };
    }
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    // Check health every 30 seconds
    setInterval(async () => {
      await this.checkHealth();
    }, 30000);

    // Initial health check
    setTimeout(() => this.checkHealth(), 1000);
  }

  /**
   * Get current AI service statistics
   */
  getStats() {
    return {
      endpoint: this.rtxEndpoint,
      healthStatus: this.healthStatus,
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failures: this.circuitBreaker.failures,
        lastFailure: this.circuitBreaker.lastFailure
      },
      configuration: {
        maxRetries: this.maxRetries,
        timeout: this.timeout,
        circuitBreakerThreshold: this.circuitBreakerThreshold
      }
    };
  }

  /**
   * Reset circuit breaker (manual intervention)
   */
  resetCircuitBreaker() {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.state = 'closed';
    this.circuitBreaker.lastFailure = null;
    
    winston.info('Circuit breaker manually reset');
    
    return this.circuitBreaker;
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    winston.info('AI Service shutting down');
    this.removeAllListeners();
  }
}

// Export singleton instance
const aiService = new AIService();

module.exports = aiService;