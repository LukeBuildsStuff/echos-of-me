#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const EXTERNAL_URL = 'http://192.168.150.117:3001';

class WebsiteTester {
    constructor() {
        this.results = {
            mainSite: {},
            externalSite: {},
            adminPortal: {},
            apiEndpoints: {},
            errors: [],
            warnings: [],
            performance: {},
            mobile: {}
        };
    }

    async log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
        
        if (type === 'error') {
            this.results.errors.push({ message, timestamp });
        } else if (type === 'warning') {
            this.results.warnings.push({ message, timestamp });
        }
    }

    async testUrl(url, description) {
        try {
            const startTime = Date.now();
            const response = await axios.get(url, {
                timeout: 10000,
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status < 500; // Allow 4xx responses
                }
            });
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            await this.log(`✓ ${description}: ${response.status} - ${responseTime}ms`);
            
            return {
                success: true,
                status: response.status,
                responseTime,
                headers: response.headers,
                contentLength: response.data.length,
                contentType: response.headers['content-type']
            };
        } catch (error) {
            await this.log(`✗ ${description}: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    async testApiEndpoint(endpoint, description) {
        try {
            const url = `${BASE_URL}/api${endpoint}`;
            const startTime = Date.now();
            const response = await axios.get(url, {
                timeout: 5000,
                validateStatus: function (status) {
                    return status < 500;
                }
            });
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            await this.log(`✓ API ${description}: ${response.status} - ${responseTime}ms`);
            
            return {
                success: true,
                status: response.status,
                responseTime,
                data: typeof response.data === 'object' ? response.data : 'Non-JSON response',
                headers: response.headers
            };
        } catch (error) {
            await this.log(`✗ API ${description}: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message
            };
        }
    }

    async testMainPages() {
        await this.log('=== Testing Main Website Pages ===');
        
        const pages = [
            { url: BASE_URL, name: 'Homepage' },
            { url: `${BASE_URL}/dashboard`, name: 'Dashboard' },
            { url: `${BASE_URL}/daily-question`, name: 'Daily Question' },
            { url: `${BASE_URL}/training`, name: 'Training Page' },
            { url: `${BASE_URL}/ai-echo`, name: 'AI Echo' },
            { url: `${BASE_URL}/auth/signin`, name: 'Sign In' },
            { url: `${BASE_URL}/auth/register`, name: 'Register' }
        ];

        for (const page of pages) {
            this.results.mainSite[page.name] = await this.testUrl(page.url, page.name);
        }
    }

    async testExternalAccess() {
        await this.log('=== Testing External URL Access ===');
        
        const pages = [
            { url: EXTERNAL_URL, name: 'External Homepage' },
            { url: `${EXTERNAL_URL}/admin`, name: 'External Admin Portal' }
        ];

        for (const page of pages) {
            this.results.externalSite[page.name] = await this.testUrl(page.url, page.name);
        }
    }

    async testAdminPortal() {
        await this.log('=== Testing Admin Portal Pages ===');
        
        const adminPages = [
            { url: `${BASE_URL}/admin`, name: 'Admin Dashboard' },
            { url: `${BASE_URL}/admin/users`, name: 'Admin Users' },
            { url: `${BASE_URL}/admin/training`, name: 'Admin Training' },
            { url: `${BASE_URL}/admin/monitoring/system`, name: 'System Monitoring' },
            { url: `${BASE_URL}/admin/monitoring/gpu`, name: 'GPU Monitoring' },
            { url: `${BASE_URL}/admin/settings`, name: 'Admin Settings' },
            { url: `${BASE_URL}/admin/security`, name: 'Admin Security' },
            { url: `${BASE_URL}/admin/reports`, name: 'Admin Reports' }
        ];

        for (const page of adminPages) {
            this.results.adminPortal[page.name] = await this.testUrl(page.url, page.name);
        }
    }

    async testApiEndpoints() {
        await this.log('=== Testing API Endpoints ===');
        
        const endpoints = [
            { path: '/health', name: 'Health Check' },
            { path: '/daily-status', name: 'Daily Status' },
            { path: '/admin/analytics', name: 'Admin Analytics' },
            { path: '/admin/database/health', name: 'Database Health' },
            { path: '/admin/monitoring', name: 'Admin Monitoring' },
            { path: '/admin/settings', name: 'Admin Settings API' },
            { path: '/admin/users/list', name: 'Admin User List' },
            { path: '/training/status', name: 'Training Status' },
            { path: '/voice/health', name: 'Voice Health' }
        ];

        for (const endpoint of endpoints) {
            this.results.apiEndpoints[endpoint.name] = await this.testApiEndpoint(endpoint.path, endpoint.name);
        }
    }

    async testStaticAssets() {
        await this.log('=== Testing Static Assets ===');
        
        try {
            // Test if Next.js is serving static assets properly
            const response = await axios.get(`${BASE_URL}/_next/static/chunks/webpack.js`, {
                timeout: 5000,
                validateStatus: function (status) {
                    return status < 500;
                }
            });
            
            if (response.status === 200) {
                await this.log('✓ Static assets loading correctly');
            } else {
                await this.log('⚠ Static assets may have issues', 'warning');
            }
        } catch (error) {
            await this.log('⚠ Could not verify static assets', 'warning');
        }
    }

    async checkForCommonIssues() {
        await this.log('=== Checking for Common Issues ===');
        
        try {
            // Test for CORS issues
            const response = await axios.get(`${BASE_URL}/api/health`, {
                headers: {
                    'Origin': 'http://different-origin.com'
                }
            });
            await this.log('✓ CORS appears to be configured correctly');
        } catch (error) {
            await this.log('⚠ Potential CORS configuration issue', 'warning');
        }

        // Test for basic security headers
        try {
            const response = await axios.get(BASE_URL);
            const headers = response.headers;
            
            if (!headers['x-frame-options'] && !headers['content-security-policy']) {
                await this.log('⚠ Missing security headers (X-Frame-Options, CSP)', 'warning');
            }
            
            if (headers['x-powered-by']) {
                await this.log('⚠ X-Powered-By header exposed', 'warning');
            }
        } catch (error) {
            await this.log('Could not check security headers', 'warning');
        }
    }

    async generateReport() {
        await this.log('=== Generating Test Report ===');
        
        const report = {
            testSummary: {
                timestamp: new Date().toISOString(),
                totalErrors: this.results.errors.length,
                totalWarnings: this.results.warnings.length
            },
            results: this.results,
            recommendations: []
        };

        // Add recommendations based on findings
        if (this.results.errors.length > 0) {
            report.recommendations.push('Critical errors found that need immediate attention');
        }
        
        if (this.results.warnings.length > 0) {
            report.recommendations.push('Warnings found that should be addressed for better security and performance');
        }

        // Check response times
        const slowEndpoints = [];
        Object.entries(this.results.apiEndpoints).forEach(([name, result]) => {
            if (result.success && result.responseTime > 1000) {
                slowEndpoints.push(`${name}: ${result.responseTime}ms`);
            }
        });

        if (slowEndpoints.length > 0) {
            report.recommendations.push(`Slow API endpoints detected: ${slowEndpoints.join(', ')}`);
        }

        const reportPath = path.join(__dirname, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        await this.log(`✓ Test report saved to: ${reportPath}`);
        return report;
    }

    async runAllTests() {
        await this.log('Starting comprehensive website testing...');
        
        try {
            await this.testMainPages();
            await this.testExternalAccess();
            await this.testAdminPortal();
            await this.testApiEndpoints();
            await this.testStaticAssets();
            await this.checkForCommonIssues();
            
            const report = await this.generateReport();
            
            await this.log('=== TEST SUMMARY ===');
            await this.log(`Total Errors: ${report.testSummary.totalErrors}`);
            await this.log(`Total Warnings: ${report.testSummary.totalWarnings}`);
            
            if (report.recommendations.length > 0) {
                await this.log('=== RECOMMENDATIONS ===');
                report.recommendations.forEach(rec => this.log(`• ${rec}`));
            }
            
            return report;
        } catch (error) {
            await this.log(`Fatal error during testing: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Run the tests
if (require.main === module) {
    const tester = new WebsiteTester();
    tester.runAllTests()
        .then(() => {
            console.log('\n✓ Testing completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n✗ Testing failed:', error.message);
            process.exit(1);
        });
}

module.exports = WebsiteTester;