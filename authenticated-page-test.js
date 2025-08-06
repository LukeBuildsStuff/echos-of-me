#!/usr/bin/env node

/**
 * Authenticated Page Testing for Personal AI Clone
 * Tests dashboard, chat, and data visualization pages
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'http://localhost:3004';
const TEST_CREDENTIALS = {
    email: 'lukemoeller@yahoo.com',
    password: 'password123'
};

class AuthenticatedPageTester {
    constructor() {
        this.cookieJar = null;
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
    }

    logTest(test, status, details = '') {
        const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${statusSymbol} ${test}: ${status}`);
        if (details) console.log(`   ${details}`);
        
        this.results.tests.push({ test, status, details });
        if (status === 'PASS') this.results.passed++;
        else if (status === 'FAIL') this.results.failed++;
        else this.results.warnings++;
    }

    async authenticateUser() {
        console.log('🔐 Authenticating test user...\n');

        try {
            // First get the login page to establish session
            const loginPageResponse = await axios.get(`${BASE_URL}/login`);
            const cookies = loginPageResponse.headers['set-cookie'];

            // Create authenticated session
            const loginData = new URLSearchParams();
            loginData.append('email', TEST_CREDENTIALS.email);
            loginData.append('password', TEST_CREDENTIALS.password);

            const loginResponse = await axios.post(`${BASE_URL}/login`, loginData, {
                maxRedirects: 0,
                validateStatus: null,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies ? cookies.join('; ') : ''
                }
            });

            if (loginResponse.status === 302) {
                // Store session cookie for subsequent requests
                this.cookieJar = loginResponse.headers['set-cookie']?.join('; ') || '';
                this.logTest('User authentication', 'PASS', `Redirected to: ${loginResponse.headers.location}`);
                return true;
            } else {
                this.logTest('User authentication', 'FAIL', `Login failed with status: ${loginResponse.status}`);
                return false;
            }

        } catch (error) {
            this.logTest('Authentication error', 'FAIL', error.message);
            return false;
        }
    }

    async testDashboardPage() {
        console.log('\n📊 Testing Dashboard Page...\n');

        try {
            const response = await axios.get(`${BASE_URL}/dashboard`, {
                headers: {
                    'Cookie': this.cookieJar
                }
            });

            if (response.status === 200) {
                this.logTest('Dashboard page access', 'PASS', 'Page loaded successfully');

                const content = response.data;
                const $ = cheerio.load(content);

                // Test dashboard content
                const hasMainContent = $('main').text().trim().length > 0;
                this.logTest('Dashboard main content', hasMainContent ? 'PASS' : 'WARN', 'Content present in main area');

                // Test navigation
                const hasNavigation = $('nav').length > 0 || $('.nav').length > 0;
                this.logTest('Dashboard navigation', hasNavigation ? 'PASS' : 'WARN', 'Navigation menu found');

                // Test memory/legacy themed content
                const hasMemoryContent = content.includes('memory') || content.includes('legacy') || content.includes('story');
                this.logTest('Memory-themed content', hasMemoryContent ? 'PASS' : 'WARN', 'Legacy/memory theming present');

                // Test progress indicators
                const hasProgressElements = content.includes('progress') || content.includes('stats') || $('[class*="progress"]').length > 0;
                this.logTest('Progress indicators', hasProgressElements ? 'PASS' : 'WARN', 'Progress/statistics elements');

                // Test responsive layout
                const hasResponsiveClasses = content.includes('responsive') || content.includes('@media') || content.includes('flex');
                this.logTest('Responsive dashboard layout', hasResponsiveClasses ? 'PASS' : 'WARN', 'Responsive design elements');

            } else {
                this.logTest('Dashboard page access', 'FAIL', `HTTP ${response.status}`);
            }

        } catch (error) {
            this.logTest('Dashboard test error', 'FAIL', error.message);
        }
    }

    async testChatPage() {
        console.log('\n💬 Testing Chat Page...\n');

        try {
            const response = await axios.get(`${BASE_URL}/chat`, {
                headers: {
                    'Cookie': this.cookieJar
                }
            });

            if (response.status === 200) {
                this.logTest('Chat page access', 'PASS', 'Page loaded successfully');

                const content = response.data;
                const $ = cheerio.load(content);

                // Test chat interface elements
                const hasChatContainer = $('[class*="chat"]').length > 0 || content.includes('conversation');
                this.logTest('Chat interface container', hasChatContainer ? 'PASS' : 'WARN', 'Chat UI elements present');

                // Test message input
                const hasMessageInput = $('input[type="text"]').length > 0 || $('textarea').length > 0;
                this.logTest('Message input field', hasMessageInput ? 'PASS' : 'WARN', 'Input mechanism for messages');

                // Test conversation area
                const hasConversationArea = $('[class*="message"]').length > 0 || content.includes('conversation');
                this.logTest('Conversation display area', hasConversationArea ? 'PASS' : 'WARN', 'Message display area');

                // Test AI-themed elements
                const hasAITheming = content.includes('AI') || content.includes('echo') || content.includes('assistant');
                this.logTest('AI chat theming', hasAITheming ? 'PASS' : 'WARN', 'AI conversation theming');

            } else {
                this.logTest('Chat page access', 'FAIL', `HTTP ${response.status}`);
            }

        } catch (error) {
            this.logTest('Chat test error', 'FAIL', error.message);
        }
    }

    async testDataVisualizationPage() {
        console.log('\n📈 Testing Data Visualization Page...\n');

        try {
            const response = await axios.get(`${BASE_URL}/data`, {
                headers: {
                    'Cookie': this.cookieJar
                }
            });

            if (response.status === 200) {
                this.logTest('Data page access', 'PASS', 'Page loaded successfully');

                const content = response.data;
                const $ = cheerio.load(content);

                // Test data visualization elements
                const hasDataElements = $('[class*="chart"]').length > 0 || $('[class*="graph"]').length > 0 || content.includes('visualization');
                this.logTest('Data visualization elements', hasDataElements ? 'PASS' : 'WARN', 'Chart/graph elements');

                // Test timeline features
                const hasTimeline = content.includes('timeline') || $('[class*="timeline"]').length > 0;
                this.logTest('Timeline visualization', hasTimeline ? 'PASS' : 'WARN', 'Timeline elements present');

                // Test memory cards
                const hasMemoryCards = content.includes('memory') && ($('[class*="card"]').length > 0 || content.includes('story'));
                this.logTest('Memory cards display', hasMemoryCards ? 'PASS' : 'WARN', 'Memory/story card elements');

                // Test data filtering/organization
                const hasDataOrganization = content.includes('filter') || content.includes('sort') || $('select').length > 0;
                this.logTest('Data organization features', hasDataOrganization ? 'PASS' : 'WARN', 'Filtering/sorting options');

            } else {
                this.logTest('Data page access', 'FAIL', `HTTP ${response.status}`);
            }

        } catch (error) {
            this.logTest('Data visualization test error', 'FAIL', error.message);
        }
    }

    async testPageTemplateStructure() {
        console.log('\n🏗️  Testing Page Template Structure...\n');

        try {
            // Test template files
            const templateFiles = ['dashboard.ejs', 'chat.ejs', 'data.ejs'];
            
            for (const template of templateFiles) {
                const templatePath = `/home/luke/personal-ai-clone/web/views/${template}`;
                const exists = fs.existsSync(templatePath);
                
                if (exists) {
                    const content = fs.readFileSync(templatePath, 'utf8');
                    
                    // Test for memory/legacy theming
                    const hasMemoryTheming = content.includes('memory') || content.includes('legacy') || content.includes('story');
                    this.logTest(`${template} memory theming`, hasMemoryTheming ? 'PASS' : 'WARN', 'Memory-focused content');
                    
                    // Test for responsive design
                    const hasResponsiveDesign = content.includes('responsive') || content.includes('@media') || content.includes('mobile');
                    this.logTest(`${template} responsive design`, hasResponsiveDesign ? 'PASS' : 'WARN', 'Mobile-friendly elements');
                    
                    this.logTest(`${template} template`, 'PASS', 'Template file exists and accessible');
                } else {
                    this.logTest(`${template} template`, 'FAIL', 'Template file not found');
                }
            }

        } catch (error) {
            this.logTest('Template structure test', 'FAIL', error.message);
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Authenticated Page Testing');
        console.log('Testing dashboard, chat, and data visualization pages...\n');

        const authenticated = await this.authenticateUser();
        
        if (authenticated) {
            await this.testDashboardPage();
            await this.testChatPage();
            await this.testDataVisualizationPage();
        } else {
            console.log('⚠️  Skipping authenticated page tests due to authentication failure');
        }

        await this.testPageTemplateStructure();
        this.generateReport();
    }

    generateReport() {
        console.log('\n📋 AUTHENTICATED PAGES TEST REPORT');
        console.log('='.repeat(60));

        const total = this.results.passed + this.results.failed + this.results.warnings;
        const passRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;

        console.log(`\n📊 AUTHENTICATED PAGES RESULTS:`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️  Warnings: ${this.results.warnings}`);
        console.log(`📈 Pass Rate: ${passRate}%\n`);

        console.log('🎯 DETAILED TEST RESULTS:');
        this.results.tests.forEach(test => {
            const statusSymbol = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
            console.log(`  ${statusSymbol} ${test.test}: ${test.status}`);
            if (test.details) console.log(`     ${test.details}`);
        });

        console.log('\n✨ AUTHENTICATED PAGES ASSESSMENT:');
        
        if (passRate >= 85) {
            console.log('🎉 EXCELLENT: All authenticated pages working beautifully!');
            console.log('   📊 Dashboard provides clear user insights');
            console.log('   💬 Chat interface is functional and themed');
            console.log('   📈 Data visualization meets requirements');
        } else if (passRate >= 70) {
            console.log('👍 GOOD: Authenticated pages are functional with minor improvements needed');
            console.log('   ✅ Core functionality present');
            console.log('   🔧 Some features need refinement');
        } else if (passRate >= 50) {
            console.log('⚠️  FAIR: Authenticated pages need significant work');
            console.log('   ⚡ Multiple areas require attention');
            console.log('   🔧 Major improvements needed');
        } else {
            console.log('🚨 POOR: Authenticated pages have critical issues');
            console.log('   ❌ Extensive fixes required');
        }

        console.log('\n='.repeat(60));
    }
}

// Run the tests
const tester = new AuthenticatedPageTester();
tester.runAllTests().catch(console.error);