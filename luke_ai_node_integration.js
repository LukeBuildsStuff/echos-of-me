/**
 * Luke AI Node.js Integration
 * Bridge between Next.js app and Python inference engine
 */

const { spawn } = require('child_process');
const path = require('path');

class LukeAIIntegration {
    constructor() {
        this.pythonScript = '/home/luke/personal-ai-clone/web/luke_ai_inference_engine.py';
        this.isReady = false;
        this.checkReadiness();
    }

    /**
     * Check if the AI model is ready for inference
     */
    async checkReadiness() {
        try {
            const status = await this.getStatus();
            this.isReady = status.model_loaded;
            console.log('Luke AI Status:', {
                ready: this.isReady,
                device: status.device,
                gpu_memory_usage: status.gpu_memory?.usage_percent 
                    ? `${(status.gpu_memory.usage_percent * 100).toFixed(1)}%` 
                    : 'N/A'
            });
            return this.isReady;
        } catch (error) {
            console.error('Failed to check Luke AI readiness:', error.message);
            this.isReady = false;
            return false;
        }
    }

    /**
     * Execute Python inference engine
     */
    executePython(args) {
        return new Promise((resolve, reject) => {
            const python = spawn('python3', [this.pythonScript, ...args]);
            
            let stdout = '';
            let stderr = '';

            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            python.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        // Find JSON output in stdout (first line should be JSON)
                        const lines = stdout.trim().split('\n');
                        let jsonResult = null;
                        
                        // Try to parse the first few lines as JSON
                        for (const line of lines) {
                            if (line.trim().startsWith('{')) {
                                try {
                                    jsonResult = JSON.parse(line.trim());
                                    break;
                                } catch (e) {
                                    // Continue to next line
                                }
                            }
                        }
                        
                        if (jsonResult) {
                            resolve(jsonResult);
                        } else {
                            // If no JSON found, look for complete JSON block
                            const fullOutput = stdout.trim();
                            const jsonMatch = fullOutput.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                jsonResult = JSON.parse(jsonMatch[0]);
                                resolve(jsonResult);
                            } else {
                                reject(new Error(`No valid JSON found in output: ${stdout.substring(0, 200)}...`));
                            }
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON: ${error.message}. Output: ${stdout.substring(0, 200)}...`));
                    }
                } else {
                    reject(new Error(`Python process exited with code ${code}: ${stderr}`));
                }
            });

            python.on('error', (error) => {
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });
        });
    }

    /**
     * Get AI engine status
     */
    async getStatus() {
        return await this.executePython(['status']);
    }

    /**
     * Generate response from Luke AI
     */
    async generateResponse(prompt, options = {}) {
        if (!this.isReady) {
            await this.checkReadiness();
            if (!this.isReady) {
                throw new Error('Luke AI model is not ready. Please check the server logs.');
            }
        }

        try {
            const result = await this.executePython([prompt]);
            
            if (result.error) {
                throw new Error(`AI Generation Error: ${result.error}`);
            }

            return {
                response: result.response,
                metadata: {
                    tokens_generated: result.tokens_generated,
                    generation_time: result.generation_time,
                    tokens_per_second: result.tokens_per_second,
                    inference_count: result.inference_count
                }
            };
        } catch (error) {
            console.error('Luke AI generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Test the integration with a sample prompt
     */
    async test() {
        console.log('Testing Luke AI integration...');
        
        try {
            const status = await this.getStatus();
            console.log('✅ Status check passed');

            const testPrompt = "What's your perspective on building meaningful relationships?";
            const result = await this.generateResponse(testPrompt);
            
            console.log('✅ Generation test passed');
            console.log('Response:', result.response);
            console.log('Performance:', `${result.metadata.tokens_per_second.toFixed(1)} tokens/sec`);
            
            return true;
        } catch (error) {
            console.error('❌ Integration test failed:', error.message);
            return false;
        }
    }
}

// Example usage for testing
async function main() {
    console.log('🚀 Luke AI Node.js Integration Test');
    
    const lukeAI = new LukeAIIntegration();
    const success = await lukeAI.test();
    
    if (success) {
        console.log('🎉 Luke AI integration is working perfectly!');
    } else {
        console.log('💥 Luke AI integration has issues. Check the logs above.');
        process.exit(1);
    }
}

// Export for use in Next.js
module.exports = LukeAIIntegration;

// Run test if called directly
if (require.main === module) {
    main().catch(console.error);
}