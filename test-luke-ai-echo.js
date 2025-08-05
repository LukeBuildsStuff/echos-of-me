#!/usr/bin/env node

/**
 * Luke AI Echo Test Suite
 * Tests the AI Echo chat functionality to verify Luke's trained model is working
 */

const https = require('https');
const http = require('http');

class LukeAIEchoTester {
    constructor(baseUrl = 'http://localhost:3001') {
        this.baseUrl = baseUrl;
        this.sessionCookie = null;
        this.testResults = [];
        this.conversationId = `test_conv_${Date.now()}`;
    }

    // Helper function to make HTTP requests
    async makeRequest(options, data = null) {
        return new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(data);
            }
            req.end();
        });
    }

    // Step 1: Test login functionality
    async testLogin() {
        console.log('\n🔐 Testing Login Functionality...');
        
        try {
            // First get the signin page to check if NextAuth is properly configured
            const signinResponse = await this.makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/auth/signin',
                method: 'GET'
            });

            if (signinResponse.statusCode === 200) {
                this.testResults.push({
                    test: 'Login Page Access',
                    status: '✅ PASS',
                    details: 'Signin page accessible'
                });
            } else {
                this.testResults.push({
                    test: 'Login Page Access',
                    status: '❌ FAIL',
                    details: `Status: ${signinResponse.statusCode}`
                });
                return false;
            }

            // Check if we can access the API endpoints (will likely redirect without auth)
            const apiResponse = await this.makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/api/auth/session',
                method: 'GET'
            });

            console.log(`   - NextAuth session endpoint: ${apiResponse.statusCode}`);
            
            return true;
        } catch (error) {
            console.error('   ❌ Login test failed:', error.message);
            this.testResults.push({
                test: 'Login Functionality',
                status: '❌ FAIL',
                details: error.message
            });
            return false;
        }
    }

    // Step 2: Test AI Echo page accessibility
    async testAIEchoPageAccess() {
        console.log('\n🤖 Testing AI Echo Page Access...');
        
        try {
            const response = await this.makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/ai-echo',
                method: 'GET'
            });

            if (response.statusCode === 200) {
                // Check if the page contains expected elements
                const hasAIEchoTitle = response.body.includes('AI Echo') || response.body.includes('Personal AI');
                const hasTextarea = response.body.includes('textarea') || response.body.includes('input');
                const hasSendButton = response.body.includes('Send') || response.body.includes('button');

                if (hasAIEchoTitle && hasTextarea && hasSendButton) {
                    this.testResults.push({
                        test: 'AI Echo Page Access',
                        status: '✅ PASS',
                        details: 'Page loads with expected chat interface elements'
                    });
                    console.log('   ✅ AI Echo page accessible with chat interface');
                    return true;
                } else {
                    this.testResults.push({
                        test: 'AI Echo Page Access',
                        status: '⚠️ PARTIAL',
                        details: 'Page loads but missing some expected elements'
                    });
                    console.log('   ⚠️ Page loads but some elements may be missing');
                    return true;
                }
            } else if (response.statusCode === 302 || response.statusCode === 307) {
                this.testResults.push({
                    test: 'AI Echo Page Access',
                    status: '⚠️ REDIRECT',
                    details: 'Redirected (likely requires authentication)'
                });
                console.log('   ⚠️ Page redirected - likely requires authentication');
                return true;
            } else {
                this.testResults.push({
                    test: 'AI Echo Page Access',
                    status: '❌ FAIL',
                    details: `HTTP ${response.statusCode}`
                });
                console.log(`   ❌ Failed with status: ${response.statusCode}`);
                return false;
            }
        } catch (error) {
            console.error('   ❌ AI Echo page test failed:', error.message);
            this.testResults.push({
                test: 'AI Echo Page Access',
                status: '❌ FAIL',
                details: error.message
            });
            return false;
        }
    }

    // Step 3: Test AI Chat API endpoints
    async testAIChatAPI() {
        console.log('\n💬 Testing AI Chat API...');
        
        const testQuestions = [
            "What's the most important thing you've learned in life?",
            "Tell me about your philosophy on work",
            "What advice would you give about handling challenges?",
            "What matters most to you in relationships?"
        ];

        for (const question of testQuestions) {
            try {
                console.log(`   Testing question: "${question.substring(0, 40)}..."`);
                
                const requestData = JSON.stringify({
                    message: question,
                    conversationId: this.conversationId,
                    includeVoice: true,
                    isDemo: false
                });

                const response = await this.makeRequest({
                    hostname: 'localhost',
                    port: 3001,
                    path: '/api/ai-echo/chat',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(requestData),
                        'Cookie': this.sessionCookie || ''
                    }
                }, requestData);

                if (response.statusCode === 200) {
                    try {
                        const data = JSON.parse(response.body);
                        
                        if (data.response) {
                            // Check if response seems personal (not generic)
                            const responseText = data.response.toLowerCase();
                            const hasPersonalMarkers = responseText.includes('i') || 
                                                    responseText.includes('my') || 
                                                    responseText.includes('me') ||
                                                    responseText.includes('luke');
                            
                            this.testResults.push({
                                test: `AI Response: "${question.substring(0, 30)}..."`,
                                status: '✅ PASS',
                                details: `Response received (${data.response.length} chars, confidence: ${data.confidence || 'N/A'})`
                            });
                            
                            console.log(`     ✅ Response received (${data.response.length} chars)`);
                            console.log(`     📊 Confidence: ${data.confidence || 'N/A'}`);
                            console.log(`     🧠 Source: ${data.source || 'N/A'}`);
                            console.log(`     🎯 Personal markers: ${hasPersonalMarkers ? 'Yes' : 'No'}`);
                            
                            // Check for Luke's trained model success message
                            if (data.source && data.source.includes('luke') || 
                                response.body.includes('LUKE TRAINED MODEL SUCCESS')) {
                                console.log('     🎉 LUKE TRAINED MODEL SUCCESS detected!');
                                this.testResults.push({
                                    test: 'Luke Trained Model Detection',
                                    status: '✅ SUCCESS',
                                    details: 'Luke trained model is responding'
                                });
                            }
                            
                            // Log the response for manual verification
                            console.log(`     💭 Response preview: "${data.response.substring(0, 100)}..."`);
                            
                        } else {
                            this.testResults.push({
                                test: `AI Response: "${question.substring(0, 30)}..."`,
                                status: '❌ FAIL',
                                details: 'No response in API return'
                            });
                            console.log('     ❌ No response content received');
                        }
                    } catch (parseError) {
                        this.testResults.push({
                            test: `AI Response: "${question.substring(0, 30)}..."`,
                            status: '❌ FAIL',
                            details: 'Invalid JSON response'
                        });
                        console.log('     ❌ Invalid JSON response');
                    }
                } else if (response.statusCode === 302 || response.statusCode === 307) {
                    this.testResults.push({
                        test: `AI Response: "${question.substring(0, 30)}..."`,
                        status: '⚠️ AUTH_REQUIRED',
                        details: 'API requires authentication'
                    });
                    console.log('     ⚠️ Authentication required');
                } else {
                    this.testResults.push({
                        test: `AI Response: "${question.substring(0, 30)}..."`,
                        status: '❌ FAIL',
                        details: `HTTP ${response.statusCode}`
                    });
                    console.log(`     ❌ API failed with status: ${response.statusCode}`);
                }
                
                // Short delay between requests
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`     ❌ Error testing question: ${error.message}`);
                this.testResults.push({
                    test: `AI Response: "${question.substring(0, 30)}..."`,
                    status: '❌ ERROR',
                    details: error.message
                });
            }
        }
    }

    // Step 4: Test Voice Synthesis API
    async testVoiceSynthesis() {
        console.log('\n🎵 Testing Voice Synthesis...');
        
        try {
            const testText = "Hello, this is Luke's AI echo speaking.";
            const requestData = JSON.stringify({
                text: testText,
                voiceId: 'lukemoeller_yahoo_com'
            });

            const response = await this.makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/api/voice/synthesize',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestData),
                    'Cookie': this.sessionCookie || ''
                }
            }, requestData);

            if (response.statusCode === 200) {
                try {
                    const data = JSON.parse(response.body);
                    if (data.success && data.audioUrl) {
                        this.testResults.push({
                            test: 'Voice Synthesis',
                            status: '✅ PASS',
                            details: `Audio generated: ${data.audioUrl}`
                        });
                        console.log('   ✅ Voice synthesis working');
                        console.log(`     🎯 Audio URL: ${data.audioUrl}`);
                        console.log(`     ⭐ Quality: ${data.quality || 'N/A'}`);
                    } else {
                        this.testResults.push({
                            test: 'Voice Synthesis',
                            status: '❌ FAIL',
                            details: 'No audio URL returned'
                        });
                        console.log('   ❌ Voice synthesis failed - no audio URL');
                    }
                } catch (parseError) {
                    this.testResults.push({
                        test: 'Voice Synthesis',
                        status: '❌ FAIL',
                        details: 'Invalid JSON response'
                    });
                    console.log('   ❌ Voice synthesis - invalid response');
                }
            } else if (response.statusCode === 302 || response.statusCode === 307) {
                this.testResults.push({
                    test: 'Voice Synthesis',
                    status: '⚠️ AUTH_REQUIRED',
                    details: 'Voice API requires authentication'
                });
                console.log('   ⚠️ Voice synthesis requires authentication');
            } else {
                this.testResults.push({
                    test: 'Voice Synthesis',
                    status: '❌ FAIL',
                    details: `HTTP ${response.statusCode}`
                });
                console.log(`   ❌ Voice synthesis failed: ${response.statusCode}`);
            }
        } catch (error) {
            console.error('   ❌ Voice synthesis test failed:', error.message);
            this.testResults.push({
                test: 'Voice Synthesis',
                status: '❌ ERROR',
                details: error.message
            });
        }
    }

    // Step 5: Test system health endpoints
    async testSystemHealth() {
        console.log('\n🏥 Testing System Health...');
        
        const healthEndpoints = [
            '/api/health',
            '/api/models/health',
            '/api/voice/health'
        ];

        for (const endpoint of healthEndpoints) {
            try {
                const response = await this.makeRequest({
                    hostname: 'localhost',
                    port: 3001,
                    path: endpoint,
                    method: 'GET'
                });

                if (response.statusCode === 200) {
                    try {
                        const data = JSON.parse(response.body);
                        this.testResults.push({
                            test: `Health Check: ${endpoint}`,
                            status: '✅ PASS',
                            details: `Status: ${data.status || 'OK'}`
                        });
                        console.log(`   ✅ ${endpoint}: ${data.status || 'OK'}`);
                    } catch (parseError) {
                        this.testResults.push({
                            test: `Health Check: ${endpoint}`,
                            status: '⚠️ PARTIAL',
                            details: 'Non-JSON response but accessible'
                        });
                        console.log(`   ⚠️ ${endpoint}: Accessible but non-JSON`);
                    }
                } else {
                    this.testResults.push({
                        test: `Health Check: ${endpoint}`,
                        status: '❌ FAIL',
                        details: `HTTP ${response.statusCode}`
                    });
                    console.log(`   ❌ ${endpoint}: Failed (${response.statusCode})`);
                }
            } catch (error) {
                this.testResults.push({
                    test: `Health Check: ${endpoint}`,
                    status: '❌ ERROR',
                    details: error.message
                });
                console.log(`   ❌ ${endpoint}: Error - ${error.message}`);
            }
        }
    }

    // Generate comprehensive test report
    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('🎯 LUKE AI ECHO TEST REPORT');
        console.log('='.repeat(80));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.status.includes('PASS') || r.status.includes('SUCCESS')).length;
        const failedTests = this.testResults.filter(r => r.status.includes('FAIL') || r.status.includes('ERROR')).length;
        const warningTests = this.testResults.filter(r => r.status.includes('PARTIAL') || r.status.includes('AUTH_REQUIRED') || r.status.includes('REDIRECT')).length;

        console.log(`\n📊 SUMMARY:`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   ✅ Passed: ${passedTests}`);
        console.log(`   ❌ Failed: ${failedTests}`);
        console.log(`   ⚠️  Warnings: ${warningTests}`);
        console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

        console.log(`\n📋 DETAILED RESULTS:`);
        this.testResults.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.test}`);
            console.log(`      Status: ${result.status}`);
            console.log(`      Details: ${result.details}`);
            console.log('');
        });

        // Key findings
        console.log(`\n🔍 KEY FINDINGS:`);
        
        const hasLukeModel = this.testResults.some(r => r.test.includes('Luke Trained Model') && r.status.includes('SUCCESS'));
        if (hasLukeModel) {
            console.log('   🎉 Luke\'s trained model is responding successfully!');
        } else {
            console.log('   ⚠️  Luke\'s trained model status unclear or not detected');
        }

        const hasWorkingAPI = this.testResults.some(r => r.test.includes('AI Response') && r.status.includes('PASS'));
        if (hasWorkingAPI) {
            console.log('   ✅ AI chat API is functional');
        } else {
            console.log('   ❌ AI chat API needs attention');
        }

        const hasVoice = this.testResults.some(r => r.test.includes('Voice') && r.status.includes('PASS'));
        if (hasVoice) {
            console.log('   🎵 Voice synthesis is working');
        } else {
            console.log('   🔇 Voice synthesis needs attention');
        }

        console.log(`\n💡 RECOMMENDATIONS:`);
        if (failedTests === 0 && warningTests === 0) {
            console.log('   🎯 System is fully operational! Luke\'s AI Echo is ready for use.');
        } else {
            if (warningTests > failedTests) {
                console.log('   🔐 Most issues appear to be authentication-related.');
                console.log('   💻 Consider testing with proper user session for full validation.');
            }
            if (failedTests > 0) {
                console.log('   🛠️  Some critical functionality needs debugging.');
                console.log('   📋 Check server logs for detailed error information.');
            }
        }

        console.log('\n' + '='.repeat(80));
        
        return {
            totalTests,
            passedTests,
            failedTests,
            warningTests,
            successRate: Math.round((passedTests / totalTests) * 100),
            results: this.testResults
        };
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting Luke AI Echo Test Suite...');
        console.log(`Target: ${this.baseUrl}`);
        console.log(`Time: ${new Date().toISOString()}`);
        
        await this.testLogin();
        await this.testAIEchoPageAccess();
        await this.testAIChatAPI();
        await this.testVoiceSynthesis();
        await this.testSystemHealth();
        
        return this.generateReport();
    }
}

// Run the tests if this script is executed directly
if (require.main === module) {
    const tester = new LukeAIEchoTester();
    tester.runAllTests().then(report => {
        // Save report to file
        const fs = require('fs');
        const reportData = {
            timestamp: new Date().toISOString(),
            testSuite: 'Luke AI Echo Verification',
            ...report
        };
        
        fs.writeFileSync('luke-ai-echo-test-report.json', JSON.stringify(reportData, null, 2));
        console.log('\n💾 Test report saved to: luke-ai-echo-test-report.json');
        
        // Exit with appropriate code
        process.exit(report.failedTests > 0 ? 1 : 0);
    }).catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = LukeAIEchoTester;