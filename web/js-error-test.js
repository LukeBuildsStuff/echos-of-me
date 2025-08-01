#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

class JavaScriptErrorDetector {
    constructor() {
        this.results = {
            potentialErrors: [],
            warnings: [],
            recommendations: [],
            codeQuality: {}
        };
    }

    async log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    }

    analyzeHTML(html, pageName) {
        const issues = [];
        
        // Check for common JavaScript error patterns
        const errorPatterns = [
            { pattern: /console\.error/g, issue: 'Direct console.error usage found' },
            { pattern: /undefined is not a function/g, issue: 'Undefined function error pattern' },
            { pattern: /Cannot read property.*of undefined/g, issue: 'Null/undefined property access pattern' },
            { pattern: /ReferenceError/g, issue: 'Reference error pattern' },
            { pattern: /TypeError/g, issue: 'Type error pattern' },
            { pattern: /SyntaxError/g, issue: 'Syntax error pattern' },
            { pattern: /Uncaught/g, issue: 'Uncaught error pattern' },
            { pattern: /throw new Error\(/g, issue: 'Explicit error throwing' },
            { pattern: /\berror\b/gi, issue: 'General error mentions' }
        ];

        errorPatterns.forEach(({ pattern, issue }) => {
            const matches = html.match(pattern);
            if (matches && matches.length > 0) {
                issues.push({
                    type: 'potential_error',
                    issue,
                    count: matches.length,
                    pattern: pattern.toString()
                });
            }
        });

        // Check for accessibility issues
        const accessibilityPatterns = [
            { pattern: /alt=""/g, issue: 'Empty alt attributes found' },
            { pattern: /<img(?![^>]*alt=)/g, issue: 'Images without alt attributes' },
            { pattern: /<button(?![^>]*aria-label)/g, issue: 'Buttons without aria-label' },
            { pattern: /role="button"(?![^>]*tabindex)/g, issue: 'Button roles without tabindex' }
        ];

        accessibilityPatterns.forEach(({ pattern, issue }) => {
            const matches = html.match(pattern);
            if (matches && matches.length > 0) {
                issues.push({
                    type: 'accessibility_warning',
                    issue,
                    count: matches.length,
                    pattern: pattern.toString()
                });
            }
        });

        // Check for performance issues
        const performancePatterns = [
            { pattern: /<script[^>]*src=[^>]*>/g, issue: 'External script tags' },
            { pattern: /<link[^>]*rel="stylesheet"[^>]*>/g, issue: 'External stylesheets' },
            { pattern: /<img[^>]*>/g, issue: 'Images' },
            { pattern: /setTimeout\(/g, issue: 'setTimeout usage' },
            { pattern: /setInterval\(/g, issue: 'setInterval usage' }
        ];

        let scriptCount = 0, stylesheetCount = 0, imageCount = 0;
        performancePatterns.forEach(({ pattern, issue }) => {
            const matches = html.match(pattern);
            if (matches) {
                if (issue.includes('script')) scriptCount = matches.length;
                if (issue.includes('stylesheet')) stylesheetCount = matches.length;
                if (issue.includes('Images')) imageCount = matches.length;
            }
        });

        // Analyze bundle size and loading patterns
        const bundleInfo = this.analyzeBundleSize(html);
        
        return {
            pageName,
            issues,
            performance: {
                scriptCount,
                stylesheetCount,
                imageCount,
                bundleInfo
            }
        };
    }

    analyzeBundleSize(html) {
        const nextChunks = html.match(/_next\/static\/chunks\/[^"']*\.js/g) || [];
        const nextCSS = html.match(/_next\/static\/css\/[^"']*\.css/g) || [];
        
        return {
            jsChunks: nextChunks.length,
            cssFiles: nextCSS.length,
            hasWebpackChunks: nextChunks.some(chunk => chunk.includes('webpack')),
            hasMainBundle: nextChunks.some(chunk => chunk.includes('main')),
            hasPolyfills: html.includes('polyfill')
        };
    }

    async testPage(url, pageName) {
        try {
            await this.log(`Testing ${pageName} for JavaScript errors...`);
            
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const analysis = this.analyzeHTML(response.data, pageName);
            
            // Filter out common false positives
            analysis.issues = analysis.issues.filter(issue => {
                // Filter out mentions in HTML comments or script content that are likely false positives
                return !(
                    issue.issue === 'General error mentions' && 
                    issue.count > 10 // Too many matches usually means false positives
                );
            });

            await this.log(`✓ ${pageName}: Found ${analysis.issues.length} potential issues`);
            
            return analysis;
        } catch (error) {
            await this.log(`✗ Error testing ${pageName}: ${error.message}`, 'error');
            return {
                pageName,
                error: error.message,
                issues: [],
                performance: {}
            };
        }
    }

    async testMobileResponsiveness() {
        await this.log('=== Testing Mobile Responsiveness Indicators ===');
        
        try {
            const response = await axios.get('http://localhost:3001', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
                }
            });

            const html = response.data;
            const mobileIndicators = {
                hasViewportMeta: html.includes('<meta name="viewport"'),
                hasResponsiveCSS: html.includes('@media') || html.includes('responsive'),
                hasTouchIcons: html.includes('apple-touch-icon') || html.includes('touch-icon'),
                hasBootstrap: html.includes('bootstrap'),
                hasTailwind: html.includes('tailwind') || html.includes('tw-'),
                hasFlexbox: html.includes('flex') || html.includes('grid'),
                hasMobileMenu: html.includes('mobile-menu') || html.includes('hamburger'),
                hasAccessibleNavigation: html.includes('aria-expanded') || html.includes('aria-hidden')
            };

            await this.log(`Mobile viewport meta: ${mobileIndicators.hasViewportMeta ? '✓' : '✗'}`);
            await this.log(`Responsive CSS indicators: ${mobileIndicators.hasResponsiveCSS ? '✓' : '✗'}`);
            await this.log(`Touch icons: ${mobileIndicators.hasTouchIcons ? '✓' : '✗'}`);
            await this.log(`Modern CSS (Flexbox/Grid): ${mobileIndicators.hasFlexbox ? '✓' : '✗'}`);
            await this.log(`Accessible navigation: ${mobileIndicators.hasAccessibleNavigation ? '✓' : '✗'}`);

            return mobileIndicators;
        } catch (error) {
            await this.log(`Error testing mobile responsiveness: ${error.message}`, 'error');
            return {};
        }
    }

    async runAllTests() {
        await this.log('Starting JavaScript error detection and mobile testing...');
        
        const testPages = [
            { url: 'http://localhost:3001', name: 'Homepage' },
            { url: 'http://localhost:3001/admin', name: 'Admin Portal' },
            { url: 'http://localhost:3001/dashboard', name: 'Dashboard' },
            { url: 'http://localhost:3001/daily-question', name: 'Daily Question' },
            { url: 'http://localhost:3001/training', name: 'Training' }
        ];

        const pageResults = [];
        for (const page of testPages) {
            const result = await this.testPage(page.url, page.name);
            pageResults.push(result);
        }

        const mobileResults = await this.testMobileResponsiveness();

        // Compile recommendations
        const allIssues = pageResults.flatMap(page => page.issues || []);
        const errorIssues = allIssues.filter(issue => issue.type === 'potential_error');
        const accessibilityIssues = allIssues.filter(issue => issue.type === 'accessibility_warning');

        const recommendations = [];
        if (errorIssues.length > 0) {
            recommendations.push(`Found ${errorIssues.length} potential JavaScript error patterns`);
        }
        if (accessibilityIssues.length > 0) {
            recommendations.push(`Found ${accessibilityIssues.length} accessibility issues`);
        }
        if (!mobileResults.hasViewportMeta) {
            recommendations.push('Add viewport meta tag for mobile responsiveness');
        }
        if (!mobileResults.hasAccessibleNavigation) {
            recommendations.push('Improve mobile navigation accessibility');
        }

        const report = {
            timestamp: new Date().toISOString(),
            pageResults,
            mobileResults,
            summary: {
                totalPages: testPages.length,
                totalIssues: allIssues.length,
                errorPatterns: errorIssues.length,
                accessibilityIssues: accessibilityIssues.length
            },
            recommendations
        };

        // Save detailed report
        fs.writeFileSync('./js-error-report.json', JSON.stringify(report, null, 2));
        await this.log('✓ JavaScript error report saved to js-error-report.json');

        return report;
    }
}

// Run the tests
if (require.main === module) {
    const detector = new JavaScriptErrorDetector();
    detector.runAllTests()
        .then(report => {
            console.log('\n=== JAVASCRIPT ERROR & MOBILE TEST SUMMARY ===');
            console.log(`Total pages tested: ${report.summary.totalPages}`);
            console.log(`Total issues found: ${report.summary.totalIssues}`);
            console.log(`Potential error patterns: ${report.summary.errorPatterns}`);
            console.log(`Accessibility issues: ${report.summary.accessibilityIssues}`);
            
            if (report.recommendations.length > 0) {
                console.log('\n=== RECOMMENDATIONS ===');
                report.recommendations.forEach(rec => console.log(`• ${rec}`));
            } else {
                console.log('\n✓ No critical issues found');
            }
            
            process.exit(0);
        })
        .catch(error => {
            console.error('\n✗ Testing failed:', error.message);
            process.exit(1);
        });
}

module.exports = JavaScriptErrorDetector;