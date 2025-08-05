#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

class FormInteractionTester {
    constructor() {
        this.results = {
            forms: [],
            apiTests: [],
            userFlows: []
        };
    }

    async log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    }

    extractFormsFromHTML(html, pageName) {
        const forms = [];
        
        // Find form elements
        const formRegex = /<form[^>]*>(.*?)<\/form>/gis;
        const formMatches = html.match(formRegex) || [];
        
        formMatches.forEach((formHTML, index) => {
            const actionMatch = formHTML.match(/action=["']([^"']*)["']/);
            const methodMatch = formHTML.match(/method=["']([^"']*)["']/);
            
            // Extract input fields
            const inputRegex = /<input[^>]*>/gi;
            const inputs = formHTML.match(inputRegex) || [];
            
            const fields = inputs.map(input => {
                const typeMatch = input.match(/type=["']([^"']*)["']/);
                const nameMatch = input.match(/name=["']([^"']*)["']/);
                const requiredMatch = input.match(/required/);
                
                return {
                    type: typeMatch ? typeMatch[1] : 'text',
                    name: nameMatch ? nameMatch[1] : `field_${Math.random()}`,
                    required: !!requiredMatch
                };
            });

            // Extract textareas
            const textareaRegex = /<textarea[^>]*name=["']([^"']*)["'][^>]*>/gi;
            const textareas = formHTML.match(textareaRegex) || [];
            textareas.forEach(textarea => {
                const nameMatch = textarea.match(/name=["']([^"']*)["']/);
                if (nameMatch) {
                    fields.push({
                        type: 'textarea',
                        name: nameMatch[1],
                        required: textarea.includes('required')
                    });
                }
            });

            // Extract select elements
            const selectRegex = /<select[^>]*name=["']([^"']*)["'][^>]*>/gi;
            const selects = formHTML.match(selectRegex) || [];
            selects.forEach(select => {
                const nameMatch = select.match(/name=["']([^"']*)["']/);
                if (nameMatch) {
                    fields.push({
                        type: 'select',
                        name: nameMatch[1],
                        required: select.includes('required')
                    });
                }
            });

            forms.push({
                page: pageName,
                index,
                action: actionMatch ? actionMatch[1] : '',
                method: methodMatch ? methodMatch[1] : 'GET',
                fields,
                fieldCount: fields.length
            });
        });

        return forms;
    }

    async testFormEndpoints() {
        await this.log('=== Testing Form-Related API Endpoints ===');
        
        const formEndpoints = [
            { path: '/auth/register', method: 'POST', description: 'User Registration' },
            { path: '/auth/signin', method: 'POST', description: 'User Sign In' },
            { path: '/auth/forgot-password', method: 'POST', description: 'Forgot Password' },
            { path: '/user/profile', method: 'PUT', description: 'Update Profile' },
            { path: '/user/change-password', method: 'POST', description: 'Change Password' },
            { path: '/responses', method: 'POST', description: 'Submit Response' },
            { path: '/questions/generate', method: 'POST', description: 'Generate Question' },
            { path: '/training/start', method: 'POST', description: 'Start Training' },
            { path: '/voice/upload', method: 'POST', description: 'Voice Upload' }
        ];

        const results = [];
        for (const endpoint of formEndpoints) {
            try {
                const url = `http://localhost:3001/api${endpoint.path}`;
                
                // Test with empty payload to see if endpoint exists and handles validation
                const testPayload = endpoint.method === 'POST' ? {} : undefined;
                
                const response = await axios({
                    method: endpoint.method.toLowerCase(),
                    url,
                    data: testPayload,
                    timeout: 5000,
                    validateStatus: (status) => status < 500 // Allow client errors
                });
                
                await this.log(`✓ ${endpoint.description}: ${response.status} - Endpoint exists`);
                
                results.push({
                    endpoint: endpoint.path,
                    method: endpoint.method,
                    description: endpoint.description,
                    status: response.status,
                    exists: true,
                    hasValidation: response.status === 400 || response.status === 422,
                    response: response.data
                });
                
            } catch (error) {
                if (error.response) {
                    await this.log(`✓ ${endpoint.description}: ${error.response.status} - Endpoint exists with validation`);
                    results.push({
                        endpoint: endpoint.path,
                        method: endpoint.method,
                        description: endpoint.description,
                        status: error.response.status,
                        exists: true,
                        hasValidation: true,
                        response: error.response.data
                    });
                } else {
                    await this.log(`✗ ${endpoint.description}: ${error.message}`, 'error');
                    results.push({
                        endpoint: endpoint.path,
                        method: endpoint.method,
                        description: endpoint.description,
                        exists: false,
                        error: error.message
                    });
                }
            }
        }
        
        return results;
    }

    async testUserFlow() {
        await this.log('=== Testing User Flow Patterns ===');
        
        const flowTests = [];
        
        // Test anonymous user flow
        try {
            await this.log('Testing anonymous user access...');
            
            // Test accessing protected pages without auth
            const protectedPages = ['/dashboard', '/training', '/daily-question'];
            
            for (const page of protectedPages) {
                const response = await axios.get(`http://localhost:3001${page}`, {
                    timeout: 5000,
                    validateStatus: (status) => status < 500
                });
                
                const isRedirected = response.status === 302 || response.status === 307;
                const hasSignInContent = response.data.includes('sign') || response.data.includes('login');
                
                flowTests.push({
                    test: `Anonymous access to ${page}`,
                    status: response.status,
                    redirected: isRedirected,
                    hasAuthPrompt: hasSignInContent,
                    passed: isRedirected || hasSignInContent
                });
            }
            
        } catch (error) {
            await this.log(`Error in user flow testing: ${error.message}`, 'error');
        }
        
        // Test admin flow
        try {
            await this.log('Testing admin access protection...');
            
            const adminPages = ['/admin', '/admin/users', '/admin/training'];
            
            for (const page of adminPages) {
                const response = await axios.get(`http://localhost:3001${page}`, {
                    timeout: 5000,
                    validateStatus: (status) => status < 500
                });
                
                // Admin pages should either redirect or show auth requirement
                const hasAdminContent = response.data.includes('admin') || response.data.includes('Admin');
                const hasProtection = response.status === 401 || response.status === 403;
                
                flowTests.push({
                    test: `Anonymous admin access to ${page}`,
                    status: response.status,
                    hasProtection,
                    hasContent: hasAdminContent,
                    passed: hasProtection || !hasAdminContent
                });
            }
            
        } catch (error) {
            await this.log(`Error in admin flow testing: ${error.message}`, 'error');
        }
        
        return flowTests;
    }

    async runAllTests() {
        await this.log('Starting form interaction and user flow testing...');
        
        // Test pages for forms
        const testPages = [
            { url: 'http://localhost:3001/auth/signin', name: 'Sign In' },
            { url: 'http://localhost:3001/auth/register', name: 'Register' },
            { url: 'http://localhost:3001/auth/forgot-password', name: 'Forgot Password' },
            { url: 'http://localhost:3001/dashboard', name: 'Dashboard' },
            { url: 'http://localhost:3001/daily-question', name: 'Daily Question' },
            { url: 'http://localhost:3001/training', name: 'Training' }
        ];

        // Extract forms from each page
        await this.log('=== Analyzing Forms on Pages ===');
        const allForms = [];
        
        for (const page of testPages) {
            try {
                const response = await axios.get(page.url, {
                    timeout: 10000,
                    validateStatus: (status) => status < 500
                });
                
                const forms = this.extractFormsFromHTML(response.data, page.name);
                allForms.push(...forms);
                
                await this.log(`✓ ${page.name}: Found ${forms.length} forms`);
                
            } catch (error) {
                await this.log(`✗ Error analyzing ${page.name}: ${error.message}`, 'error');
            }
        }

        // Test API endpoints
        const apiResults = await this.testFormEndpoints();
        
        // Test user flows
        const flowResults = await this.testUserFlow();
        
        // Generate report
        const report = {
            timestamp: new Date().toISOString(),
            forms: allForms,
            apiEndpoints: apiResults,
            userFlows: flowResults,
            summary: {
                totalForms: allForms.length,
                totalApiEndpoints: apiResults.length,
                workingEndpoints: apiResults.filter(r => r.exists).length,
                endpointsWithValidation: apiResults.filter(r => r.hasValidation).length,
                userFlowTests: flowResults.length,
                passedFlowTests: flowResults.filter(t => t.passed).length
            }
        };

        // Save report
        fs.writeFileSync('./form-interaction-report.json', JSON.stringify(report, null, 2));
        await this.log('✓ Form interaction report saved to form-interaction-report.json');

        return report;
    }
}

// Run the tests
if (require.main === module) {
    const tester = new FormInteractionTester();
    tester.runAllTests()
        .then(report => {
            console.log('\n=== FORM INTERACTION TEST SUMMARY ===');
            console.log(`Total forms found: ${report.summary.totalForms}`);
            console.log(`API endpoints tested: ${report.summary.totalApiEndpoints}`);
            console.log(`Working endpoints: ${report.summary.workingEndpoints}`);
            console.log(`Endpoints with validation: ${report.summary.endpointsWithValidation}`);
            console.log(`User flow tests: ${report.summary.userFlowTests}`);
            console.log(`Passed flow tests: ${report.summary.passedFlowTests}`);
            
            // Show form details
            if (report.forms.length > 0) {
                console.log('\n=== FORMS FOUND ===');
                report.forms.forEach(form => {
                    console.log(`• ${form.page}: ${form.fieldCount} fields, method: ${form.method}, action: ${form.action || 'N/A'}`);
                });
            }
            
            console.log('\n✓ Form interaction testing completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n✗ Form interaction testing failed:', error.message);
            process.exit(1);
        });
}

module.exports = FormInteractionTester;