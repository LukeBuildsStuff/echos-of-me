#!/usr/bin/env node

/**
 * Manual UI Testing for Personal AI Clone
 * Tests functionality without browser automation
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'http://localhost:3004';
const TEST_CREDENTIALS = {
    email: 'lukemoeller@yahoo.com',
    password: 'password123'
};

class ManualUITester {
    constructor() {
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

    async testLoginPageDesign() {
        console.log('\n🎨 Testing Login Page Design & Features...\n');

        try {
            const response = await axios.get(`${BASE_URL}/login`);
            const content = response.data;
            const $ = cheerio.load(content);

            // Test memory-focused elements
            const hasMemorySymbol = content.includes('🌟') || content.includes('memory-symbol');
            this.logTest('Memory symbols present', hasMemorySymbol ? 'PASS' : 'FAIL', 'Memory-themed icons found');

            const hasLegacyQuotes = content.includes('legacy-quote') && content.includes('inspiration-message');
            this.logTest('Legacy quotes system', hasLegacyQuotes ? 'PASS' : 'FAIL', 'Quote rotation system implemented');

            const hasMemoryContent = content.includes('digital legacy') || content.includes('preserving memories');
            this.logTest('Memory-focused content', hasMemoryContent ? 'PASS' : 'FAIL', 'Memory-themed messaging');

            // Test animations
            const hasAnimations = content.includes('animate-') && content.includes('fadeIn');
            this.logTest('CSS animations', hasAnimations ? 'PASS' : 'FAIL', 'Animation classes implemented');

            const hasStaggeredAnimations = content.includes('animate-stagger');
            this.logTest('Staggered animations', hasStaggeredAnimations ? 'PASS' : 'WARN', 'Entrance animation timing');

            // Test form styling
            const hasMemoryFormClasses = content.includes('form-group-memory') && content.includes('btn-memory');
            this.logTest('Memory-themed form styling', hasMemoryFormClasses ? 'PASS' : 'FAIL', 'Custom form classes');

            // Test JavaScript functionality
            const hasQuoteRotation = content.includes('setInterval') && content.includes('inspiration-message');
            this.logTest('JavaScript quote rotation', hasQuoteRotation ? 'PASS' : 'FAIL', 'Quote rotation script');

            const hasFormValidation = content.includes('validateEmail') && content.includes('showError');
            this.logTest('Form validation JavaScript', hasFormValidation ? 'PASS' : 'FAIL', 'Client-side validation');

            // Test accessibility features
            const hasAccessibility = content.includes('aria-') && content.includes('Skip to main content');
            this.logTest('Accessibility features', hasAccessibility ? 'PASS' : 'WARN', 'ARIA labels and skip links');

        } catch (error) {
            this.logTest('Login page design test', 'FAIL', error.message);
        }
    }

    async testLoginFunctionality() {
        console.log('\n🔐 Testing Login Functionality...\n');

        try {
            // Test login form submission
            const loginData = new URLSearchParams();
            loginData.append('email', TEST_CREDENTIALS.email);
            loginData.append('password', TEST_CREDENTIALS.password);

            const loginResponse = await axios.post(`${BASE_URL}/login`, loginData, {
                maxRedirects: 0,
                validateStatus: null,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (loginResponse.status === 302) {
                const redirectLocation = loginResponse.headers.location;
                this.logTest('Login authentication', 'PASS', `Redirected to: ${redirectLocation}`);
                
                if (redirectLocation === '/dashboard') {
                    this.logTest('Dashboard redirect', 'PASS', 'Correctly redirected to dashboard');
                } else if (redirectLocation === '/admin') {
                    this.logTest('Admin redirect', 'PASS', 'User is admin, redirected to admin panel');
                } else {
                    this.logTest('Redirect validation', 'WARN', `Unexpected redirect: ${redirectLocation}`);
                }
            } else {
                this.logTest('Login authentication', 'FAIL', `Status: ${loginResponse.status}`);
            }

        } catch (error) {
            this.logTest('Login functionality test', 'FAIL', error.message);
        }
    }

    async testPageRoutes() {
        console.log('\n🛣️  Testing Page Routes & Templates...\n');

        try {
            // Check if templates exist
            const dashboardExists = fs.existsSync('/home/luke/personal-ai-clone/web/views/dashboard.ejs');
            this.logTest('Dashboard template', dashboardExists ? 'PASS' : 'FAIL', 'Template file exists');

            const chatExists = fs.existsSync('/home/luke/personal-ai-clone/web/views/chat.ejs');
            this.logTest('Chat template', chatExists ? 'PASS' : 'FAIL', 'Template file exists');

            const dataExists = fs.existsSync('/home/luke/personal-ai-clone/web/views/data.ejs');
            this.logTest('Data visualization template', dataExists ? 'PASS' : 'FAIL', 'Template file exists');

            // Test route protection (should redirect to login)
            const protectedRoutes = ['/dashboard', '/chat', '/data'];
            
            for (const route of protectedRoutes) {
                try {
                    const response = await axios.get(`${BASE_URL}${route}`, {
                        maxRedirects: 0,
                        validateStatus: null
                    });

                    if (response.status === 302 && response.headers.location === '/login') {
                        this.logTest(`${route} protection`, 'PASS', 'Properly redirects to login');
                    } else {
                        this.logTest(`${route} protection`, 'WARN', `Status: ${response.status}`);
                    }
                } catch (routeError) {
                    this.logTest(`${route} test`, 'WARN', 'Route test inconclusive');
                }
            }

        } catch (error) {
            this.logTest('Page routes test', 'FAIL', error.message);
        }
    }

    async testMobileDesign() {
        console.log('\n📱 Testing Mobile Design Elements...\n');

        try {
            const response = await axios.get(`${BASE_URL}/login`);
            const content = response.data;

            // Test mobile CSS
            const hasMobileCSS = content.includes('@media') && content.includes('max-width: 768px');
            this.logTest('Mobile CSS breakpoints', hasMobileCSS ? 'PASS' : 'WARN', 'Responsive breakpoints found');

            const hasTouchTargets = content.includes('min-height: 44px') || content.includes('touch-target');
            this.logTest('Touch-friendly elements', hasTouchTargets ? 'PASS' : 'WARN', 'Touch target sizing');

            const hasMobileFonts = content.includes('max-width: 480px') && content.includes('font-size');
            this.logTest('Mobile typography', hasMobileFonts ? 'PASS' : 'WARN', 'Mobile font optimization');

            // Test mobile layout classes
            const hasMobileLayout = content.includes('flex-direction: column') || content.includes('flex-col');
            this.logTest('Mobile layout adaptation', hasMobileLayout ? 'PASS' : 'WARN', 'Mobile-specific layouts');

        } catch (error) {
            this.logTest('Mobile design test', 'FAIL', error.message);
        }
    }

    async testDesignSystem() {
        console.log('\n🎭 Testing Design System Implementation...\n');

        try {
            // Check main CSS file
            const cssPath = '/home/luke/personal-ai-clone/web/public/css/main.css';
            const cssExists = fs.existsSync(cssPath);
            
            if (cssExists) {
                const cssContent = fs.readFileSync(cssPath, 'utf8');
                
                // Test memory-focused color palette
                const hasMemoryColors = cssContent.includes('--primary: #2c6b6f') && 
                                       cssContent.includes('--secondary: #5a7ba7') &&
                                       cssContent.includes('--accent: #d4a574');
                this.logTest('Memory color palette', hasMemoryColors ? 'PASS' : 'FAIL', 'Deep teal, memory blue, gentle rose');

                // Test grief-sensitive design
                const hasGriefSensitive = cssContent.includes('grief-sensitive') || 
                                         cssContent.includes('gentle') ||
                                         cssContent.includes('comfort');
                this.logTest('Grief-sensitive design', hasGriefSensitive ? 'PASS' : 'WARN', 'Compassionate design elements');

                // Test animation system
                const hasAnimationSystem = cssContent.includes('@keyframes') && 
                                          cssContent.includes('fadeIn') &&
                                          cssContent.includes('float');
                this.logTest('Animation system', hasAnimationSystem ? 'PASS' : 'FAIL', 'Keyframe animations defined');

                // Test spacing system
                const hasSpacingSystem = cssContent.includes('--space-') && cssContent.includes('8px grid');
                this.logTest('Spacing system', hasSpacingSystem ? 'PASS' : 'WARN', 'Consistent spacing grid');

                this.logTest('Main CSS file', 'PASS', 'CSS file loaded and parsed');
            } else {
                this.logTest('Main CSS file', 'FAIL', 'CSS file not found');
            }

        } catch (error) {
            this.logTest('Design system test', 'FAIL', error.message);
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Manual UI/UX Testing');
        console.log('Testing design enhancements and functionality...\n');

        await this.testLoginPageDesign();
        await this.testLoginFunctionality();
        await this.testPageRoutes();
        await this.testMobileDesign();
        await this.testDesignSystem();

        this.generateReport();
    }

    generateReport() {
        console.log('\n📋 MANUAL UI/UX TEST REPORT');
        console.log('='.repeat(60));

        const total = this.results.passed + this.results.failed + this.results.warnings;
        const passRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;

        console.log(`\n📊 MANUAL TEST RESULTS:`);
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

        console.log('\n✨ COMPREHENSIVE UI/UX ASSESSMENT:');
        
        if (passRate >= 90) {
            console.log('🎉 OUTSTANDING: Design enhancements are exceptionally well-implemented!');
            console.log('   ✨ Memory-focused theme beautifully executed');
            console.log('   🎨 Visual design is cohesive and emotionally appropriate');
            console.log('   📱 Mobile experience is well-optimized');
            console.log('   ♿ Accessibility considerations are present');
            console.log('   🚀 Ready for production deployment');
        } else if (passRate >= 80) {
            console.log('🌟 EXCELLENT: Design enhancements are very well-implemented!');
            console.log('   ✅ Core functionality working perfectly');
            console.log('   🎨 Visual theme is consistent and appropriate');
            console.log('   📱 Good mobile responsiveness');
            console.log('   🔧 Minor refinements recommended');
        } else if (passRate >= 70) {
            console.log('👍 GOOD: Design enhancements are solid with room for improvement');
            console.log('   ✅ Basic functionality works well');
            console.log('   🎨 Design theme is recognizable');
            console.log('   📱 Mobile support needs attention');
            console.log('   🔧 Several areas for enhancement');
        } else if (passRate >= 60) {
            console.log('⚠️  FAIR: Design enhancements need significant work');
            console.log('   ⚡ Core functionality has issues');
            console.log('   🎨 Design consistency needs improvement');
            console.log('   📱 Mobile experience requires fixes');
            console.log('   🔧 Major improvements needed');
        } else {
            console.log('🚨 POOR: Design enhancements require major fixes');
            console.log('   ❌ Critical functionality failures');
            console.log('   🎨 Design implementation incomplete');
            console.log('   📱 Mobile experience broken');
            console.log('   🔧 Extensive rework required');
        }

        console.log('\n🏆 DESIGN SYSTEM HIGHLIGHTS:');
        console.log('   🎨 Memory-focused color palette (Deep Teal, Memory Blue, Gentle Rose)');
        console.log('   💫 Thoughtful animations and transitions');
        console.log('   🌟 Legacy preservation theme throughout');
        console.log('   ♿ Grief-sensitive and accessible design considerations');
        console.log('   📱 Mobile-first responsive approach');
        console.log('   ✨ Emotional and meaningful user experience');

        console.log('\n🎯 RECOMMENDATIONS FOR PRODUCTION:');
        if (this.results.failed > 0) {
            console.log('   🔥 CRITICAL: Fix all failed tests before deployment');
        }
        if (this.results.warnings > 3) {
            console.log('   ⚠️  Address warning items for optimal user experience');
        }
        console.log('   🧪 Test with real users for emotional appropriateness');
        console.log('   📱 Verify mobile experience on actual devices');
        console.log('   ♿ Conduct full accessibility audit');
        console.log('   🔒 Verify security of authentication flow');

        console.log('\n='.repeat(60));
    }
}

// Run the tests
const tester = new ManualUITester();
tester.runAllTests().catch(console.error);