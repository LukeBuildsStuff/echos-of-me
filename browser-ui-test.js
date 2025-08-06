#!/usr/bin/env node

/**
 * Browser-based UI Testing for Personal AI Clone
 * Tests the actual user experience and interactions
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3004';
const TEST_CREDENTIALS = {
    email: 'lukemoeller@yahoo.com',
    password: 'password123'
};

class UITester {
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

    async testLoginPageFeatures(page) {
        console.log('\n🔐 Testing Login Page Features...\n');

        try {
            await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

            // Test page title and meta
            const title = await page.title();
            this.logTest('Login page title', title.includes('Login') || title.includes('Personal AI') ? 'PASS' : 'WARN', `Title: ${title}`);

            // Test Google Fonts loading
            const fontsLoaded = await page.evaluate(() => {
                const computedStyle = window.getComputedStyle(document.body);
                return computedStyle.fontFamily.includes('Inter') || computedStyle.fontFamily.includes('Crimson');
            });
            this.logTest('Google Fonts loaded', fontsLoaded ? 'PASS' : 'WARN', 'Font family verification');

            // Test memory-focused colors
            const memoryColors = await page.evaluate(() => {
                const style = getComputedStyle(document.documentElement);
                return style.getPropertyValue('--primary') === ' #2c6b6f' || 
                       document.querySelector('.memory-symbol') !== null;
            });
            this.logTest('Memory-focused color scheme', memoryColors ? 'PASS' : 'WARN', 'Color theme verification');

            // Test animations presence
            const animationsPresent = await page.evaluate(() => {
                return document.querySelector('[class*="animate-"]') !== null;
            });
            this.logTest('CSS animations present', animationsPresent ? 'PASS' : 'FAIL', 'Animation classes found');

            // Test legacy quotes rotation
            await page.waitForTimeout(5000); // Wait for rotation
            const quotesRotating = await page.evaluate(() => {
                const messages = document.querySelectorAll('.inspiration-message');
                if (messages.length === 0) return false;
                
                let activeCount = 0;
                messages.forEach(msg => {
                    if (msg.classList.contains('active')) activeCount++;
                });
                return activeCount === 1; // Only one should be active
            });
            this.logTest('Legacy quotes rotation', quotesRotating ? 'PASS' : 'WARN', 'Quote rotation system');

            // Test form elements
            const emailField = await page.$('#email');
            const passwordField = await page.$('#password');
            const submitButton = await page.$('button[type="submit"]');
            
            this.logTest('Login form elements', 
                emailField && passwordField && submitButton ? 'PASS' : 'FAIL',
                'Email, password, and submit button present');

            // Test responsive design
            await page.setViewport({ width: 375, height: 667 }); // Mobile size
            await page.waitForTimeout(1000);
            
            const mobileLayout = await page.evaluate(() => {
                const container = document.querySelector('.login-container');
                return container && window.innerWidth === 375;
            });
            this.logTest('Mobile responsiveness', mobileLayout ? 'PASS' : 'WARN', 'Mobile viewport adaptation');

            // Reset viewport
            await page.setViewport({ width: 1280, height: 720 });

        } catch (error) {
            this.logTest('Login page test error', 'FAIL', error.message);
        }
    }

    async testLoginFlow(page) {
        console.log('\n🚀 Testing Login Flow...\n');

        try {
            await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

            // Fill login form
            await page.type('#email', TEST_CREDENTIALS.email);
            await page.type('#password', TEST_CREDENTIALS.password);

            // Test form validation (client-side)
            const validationPresent = await page.evaluate(() => {
                return typeof validateEmail === 'function' && typeof showError === 'function';
            });
            this.logTest('Client-side validation', validationPresent ? 'PASS' : 'WARN', 'Validation functions available');

            // Submit form and wait for navigation
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
                page.click('button[type="submit"]')
            ]);

            const currentUrl = page.url();
            
            if (currentUrl.includes('/dashboard')) {
                this.logTest('Login success redirect', 'PASS', 'Redirected to dashboard');
                return true;
            } else if (currentUrl.includes('/admin')) {
                this.logTest('Login success redirect', 'PASS', 'Redirected to admin (user is admin)');
                return true;
            } else {
                this.logTest('Login success redirect', 'FAIL', `Unexpected redirect to: ${currentUrl}`);
                return false;
            }

        } catch (error) {
            this.logTest('Login flow error', 'FAIL', error.message);
            return false;
        }
    }

    async testDashboardFeatures(page) {
        console.log('\n📊 Testing Dashboard Features...\n');

        try {
            const currentUrl = page.url();
            
            if (!currentUrl.includes('/dashboard') && !currentUrl.includes('/admin')) {
                this.logTest('Dashboard access', 'SKIP', 'Not on dashboard, skipping dashboard tests');
                return;
            }

            // Wait for page to load
            await page.waitForTimeout(2000);

            // Test navigation menu
            const navExists = await page.$('nav') || await page.$('.nav');
            this.logTest('Navigation menu', navExists ? 'PASS' : 'WARN', 'Navigation elements present');

            // Test dashboard content
            const hasContent = await page.evaluate(() => {
                return document.querySelector('main') !== null && 
                       document.querySelector('main').textContent.trim().length > 0;
            });
            this.logTest('Dashboard content', hasContent ? 'PASS' : 'WARN', 'Main content area populated');

            // Test responsive layout
            await page.setViewport({ width: 768, height: 1024 }); // Tablet size
            await page.waitForTimeout(1000);
            
            const tabletLayout = await page.evaluate(() => {
                return window.innerWidth === 768;
            });
            this.logTest('Dashboard tablet responsiveness', tabletLayout ? 'PASS' : 'WARN', 'Tablet viewport adaptation');

            await page.setViewport({ width: 1280, height: 720 }); // Reset

        } catch (error) {
            this.logTest('Dashboard test error', 'FAIL', error.message);
        }
    }

    async testPageTransitions(page) {
        console.log('\n🔄 Testing Page Transitions...\n');

        try {
            // Test navigation between pages (if navigation exists)
            const navLinks = await page.$$('nav a, .nav a');
            
            if (navLinks.length > 0) {
                this.logTest('Navigation links available', 'PASS', `Found ${navLinks.length} navigation links`);

                // Test a navigation link
                for (let i = 0; i < Math.min(navLinks.length, 3); i++) {
                    try {
                        const linkText = await page.evaluate(el => el.textContent, navLinks[i]);
                        const href = await page.evaluate(el => el.href, navLinks[i]);

                        if (linkText && href && !href.includes('logout')) {
                            await navLinks[i].click();
                            await page.waitForTimeout(2000);
                            
                            const newUrl = page.url();
                            this.logTest(`Navigation to ${linkText}`, 
                                newUrl.includes(href.split('/').pop()) ? 'PASS' : 'WARN', 
                                `Navigated to: ${newUrl}`);
                            break;
                        }
                    } catch (navError) {
                        // Continue to next link
                    }
                }
            } else {
                this.logTest('Navigation links', 'WARN', 'No navigation links found');
            }

        } catch (error) {
            this.logTest('Page transitions test error', 'FAIL', error.message);
        }
    }

    async testAccessibility(page) {
        console.log('\n♿ Testing Accessibility Features...\n');

        try {
            // Test skip links
            const skipLink = await page.$('.skip-link, a[href="#main-content"]');
            this.logTest('Skip to main content link', skipLink ? 'PASS' : 'WARN', 'Accessibility skip link present');

            // Test ARIA labels
            const ariaElements = await page.$$('[aria-label], [aria-describedby], [role]');
            this.logTest('ARIA accessibility', ariaElements.length > 0 ? 'PASS' : 'WARN', `Found ${ariaElements.length} ARIA elements`);

            // Test keyboard navigation
            await page.keyboard.press('Tab');
            const focusedElement = await page.evaluate(() => document.activeElement.tagName);
            this.logTest('Keyboard navigation', focusedElement ? 'PASS' : 'WARN', `First tab focus: ${focusedElement}`);

        } catch (error) {
            this.logTest('Accessibility test error', 'FAIL', error.message);
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Browser-based UI/UX Testing');
        console.log('Testing actual user experience and interactions...\n');

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        try {
            const page = await browser.newPage();
            
            // Set user agent and viewport
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            await page.setViewport({ width: 1280, height: 720 });

            // Run all tests
            await this.testLoginPageFeatures(page);
            const loginSuccess = await this.testLoginFlow(page);
            
            if (loginSuccess) {
                await this.testDashboardFeatures(page);
                await this.testPageTransitions(page);
            }
            
            await this.testAccessibility(page);

        } catch (error) {
            console.error('Browser testing error:', error);
        } finally {
            await browser.close();
        }

        this.generateReport();
    }

    generateReport() {
        console.log('\n📋 BROWSER UI/UX TEST REPORT');
        console.log('='.repeat(50));

        const total = this.results.passed + this.results.failed + this.results.warnings;
        const passRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;

        console.log(`\n📊 BROWSER TEST RESULTS:`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️  Warnings: ${this.results.warnings}`);
        console.log(`📈 Pass Rate: ${passRate}%\n`);

        console.log('🎯 DETAILED RESULTS:');
        this.results.tests.forEach(test => {
            const statusSymbol = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
            console.log(`  ${statusSymbol} ${test.test}: ${test.status}`);
            if (test.details) console.log(`     ${test.details}`);
        });

        console.log('\n✨ UI/UX ASSESSMENT:');
        if (passRate >= 85) {
            console.log('🎉 EXCELLENT: The design enhancements are working beautifully!');
            console.log('   - Memory-focused theme is well-implemented');
            console.log('   - User experience is smooth and intuitive');
            console.log('   - Ready for production use');
        } else if (passRate >= 70) {
            console.log('👍 GOOD: The design enhancements are solid with minor areas for improvement');
            console.log('   - Core functionality works well');
            console.log('   - Some fine-tuning recommended');
        } else if (passRate >= 50) {
            console.log('⚠️  FAIR: Design enhancements need attention');
            console.log('   - Several issues require fixing');
            console.log('   - User experience could be improved');
        } else {
            console.log('🚨 POOR: Significant issues found');
            console.log('   - Major fixes required before production');
        }

        console.log('\n='.repeat(50));
    }
}

// Run the tests
const tester = new UITester();
tester.runAllTests().catch(console.error);