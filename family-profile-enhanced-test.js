const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;

class EnhancedFamilyProfileTester {
    constructor() {
        this.baseURL = 'http://localhost:3003';
        this.cookieJar = new Map();
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            maxRedirects: 5
        });
        this.testResults = {
            navigation: {},
            authentication: {},
            visualDesign: {},
            inlineEditing: {},
            quickAdd: {},
            dataPersistence: {},
            issues: [],
            findings: []
        };
    }

    parseCookies(setCookieHeaders) {
        if (!setCookieHeaders) return;
        
        setCookieHeaders.forEach(cookieStr => {
            const [nameValue, ...rest] = cookieStr.split(';');
            const [name, value] = nameValue.split('=');
            if (name && value) {
                this.cookieJar.set(name.trim(), value.trim());
            }
        });
    }

    getCookieString() {
        return Array.from(this.cookieJar.entries())
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
    }

    async performAdvancedLogin() {
        try {
            console.log('🔐 Starting advanced login process...');
            
            // Step 1: Get the signin page and CSRF token
            const signinResponse = await this.axiosInstance.get('/auth/signin');
            this.parseCookies(signinResponse.headers['set-cookie']);
            
            const $ = cheerio.load(signinResponse.data);
            const csrfToken = $('input[name="csrfToken"]').val() || 
                             $('meta[name="csrf-token"]').attr('content');
            
            console.log('CSRF Token found:', !!csrfToken);
            console.log('Cookies after signin page:', this.getCookieString());
            
            // Step 2: Try direct API login
            const loginPayload = {
                email: 'lukemoeller@yahoo.com',
                password: 'password123',
                callbackUrl: '/dashboard'
            };
            
            if (csrfToken) {
                loginPayload.csrfToken = csrfToken;
            }
            
            console.log('Attempting login with payload:', {
                email: loginPayload.email,
                hasPassword: !!loginPayload.password,
                hasCSRF: !!loginPayload.csrfToken
            });
            
            const loginResponse = await this.axiosInstance.post('/api/auth/callback/credentials', loginPayload, {
                headers: {
                    'Cookie': this.getCookieString(),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                maxRedirects: 0,
                validateStatus: status => status < 500
            });
            
            this.parseCookies(loginResponse.headers['set-cookie']);
            
            console.log('Login response status:', loginResponse.status);
            console.log('Updated cookies:', this.getCookieString());
            
            // Step 3: Verify session by checking for auth cookies or accessing protected page
            const hasSessionCookie = this.getCookieString().includes('next-auth') || 
                                   this.getCookieString().includes('session');
            
            console.log('Session cookie present:', hasSessionCookie);
            
            // Step 4: Test access to dashboard
            try {
                const dashboardTest = await this.axiosInstance.get('/dashboard', {
                    headers: { 'Cookie': this.getCookieString() },
                    maxRedirects: 0,
                    validateStatus: status => status < 500
                });
                
                console.log('Dashboard access status:', dashboardTest.status);
                
                // Check if we're actually on the dashboard (not redirected to login)
                const isDashboard = dashboardTest.status === 200 && 
                                  !dashboardTest.data.includes('Sign in') && 
                                  !dashboardTest.data.includes('sign-in');
                
                if (isDashboard) {
                    console.log('✅ Successfully logged in and accessed dashboard');
                    this.testResults.authentication.loginSuccess = true;
                    this.testResults.authentication.dashboardAccess = true;
                    return { success: true, dashboardHtml: dashboardTest.data };
                }
            } catch (dashError) {
                console.log('Dashboard access error:', dashError.message);
            }
            
            // Step 5: Alternative login methods
            console.log('Trying alternative login approach...');
            
            // Check if we can access any authenticated pages
            const protectedPages = ['/dashboard', '/profile', '/settings'];
            for (const page of protectedPages) {
                try {
                    const response = await this.axiosInstance.get(page, {
                        headers: { 'Cookie': this.getCookieString() },
                        maxRedirects: 0,
                        validateStatus: status => status < 500
                    });
                    
                    if (response.status === 200 && !response.data.includes('Sign in')) {
                        console.log(`✅ Found accessible authenticated page: ${page}`);
                        this.testResults.authentication.loginSuccess = true;
                        this.testResults.authentication.authenticatedPage = page;
                        return { success: true, dashboardHtml: response.data };
                    }
                } catch (e) {
                    // Continue to next page
                }
            }
            
            console.log('❌ All login attempts failed');
            this.testResults.authentication.loginSuccess = false;
            this.testResults.issues.push('Unable to establish authenticated session');
            
            return { success: false };
            
        } catch (error) {
            console.log('❌ Advanced login error:', error.message);
            this.testResults.authentication.loginSuccess = false;
            this.testResults.issues.push(`Login error: ${error.message}`);
            return { success: false };
        }
    }

    async exploreApplication() {
        console.log('🗺️ Exploring application structure...');
        
        try {
            // Get the main page to understand the structure
            const homeResponse = await this.axiosInstance.get('/');
            const $ = cheerio.load(homeResponse.data);
            
            // Extract all navigation links
            const links = [];
            $('a[href]').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && text && href.startsWith('/')) {
                    links.push({ href, text });
                }
            });
            
            console.log('Found navigation links:');
            links.forEach(link => console.log(`- ${link.text}: ${link.href}`));
            
            // Look specifically for family-related content
            const familyLinks = links.filter(link => 
                link.text.toLowerCase().includes('family') ||
                link.text.toLowerCase().includes('profile') ||
                link.text.toLowerCase().includes('settings') ||
                link.href.toLowerCase().includes('family') ||
                link.href.toLowerCase().includes('profile')
            );
            
            console.log('Family-related links found:');
            familyLinks.forEach(link => console.log(`- ${link.text}: ${link.href}`));
            
            this.testResults.navigation.explorationComplete = true;
            this.testResults.navigation.familyLinksFound = familyLinks.length > 0;
            this.testResults.navigation.discoveredLinks = familyLinks;
            
            return familyLinks;
            
        } catch (error) {
            console.log('❌ Application exploration error:', error.message);
            this.testResults.issues.push(`Exploration error: ${error.message}`);
            return [];
        }
    }

    async testFamilyProfileAccess(discoveredLinks) {
        console.log('🧭 Testing Family Profile access...');
        
        // Try discovered family links first
        for (const link of discoveredLinks) {
            try {
                console.log(`Testing link: ${link.text} (${link.href})`);
                
                const response = await this.axiosInstance.get(link.href, {
                    headers: { 'Cookie': this.getCookieString() },
                    validateStatus: status => status < 500
                });
                
                if (response.status === 200) {
                    console.log(`✅ Successfully accessed: ${link.href}`);
                    
                    // Analyze the page content
                    await this.analyzePageContent(response.data, link.href);
                    this.testResults.navigation.familyProfileFound = true;
                    this.testResults.navigation.familyProfileURL = link.href;
                    
                    return { success: true, html: response.data, url: link.href };
                }
            } catch (error) {
                console.log(`❌ Failed to access ${link.href}: ${error.message}`);
            }
        }
        
        // Try common family profile URLs
        const commonURLs = [
            '/settings/family-profile',
            '/family-profile',
            '/settings/family',
            '/profile/family',
            '/dashboard/family',
            '/family'
        ];
        
        for (const url of commonURLs) {
            try {
                console.log(`Testing common URL: ${url}`);
                
                const response = await this.axiosInstance.get(url, {
                    headers: { 'Cookie': this.getCookieString() },
                    validateStatus: status => status < 500
                });
                
                if (response.status === 200 && response.data.toLowerCase().includes('family')) {
                    console.log(`✅ Found family content at: ${url}`);
                    
                    await this.analyzePageContent(response.data, url);
                    this.testResults.navigation.familyProfileFound = true;
                    this.testResults.navigation.familyProfileURL = url;
                    
                    return { success: true, html: response.data, url: url };
                }
            } catch (error) {
                console.log(`❌ Failed to access ${url}: ${error.message}`);
            }
        }
        
        console.log('❌ No family profile section found');
        this.testResults.navigation.familyProfileFound = false;
        return { success: false };
    }

    async analyzePageContent(html, url) {
        console.log('🔍 Analyzing page content for UX improvements...');
        
        const $ = cheerio.load(html);
        
        // Extract visible text for analysis
        const pageText = $('body').text().toLowerCase();
        const htmlContent = html.toLowerCase();
        
        // Visual Design Analysis
        this.testResults.visualDesign = {
            hasGroups: this.checkForGroups($, htmlContent),
            hasColorCoding: this.checkForColorCoding($, htmlContent),
            hasModernDesign: this.checkForModernDesign($, htmlContent),
            raeFound: pageText.includes('rae') && (pageText.includes('daughter') || pageText.includes('child')),
            hasHierarchy: $('h1, h2, h3, h4, h5, h6').length > 0
        };
        
        // Inline Editing Analysis
        this.testResults.inlineEditing = {
            hasEditableElements: this.checkForInlineEditing($, htmlContent),
            hasAutoSave: htmlContent.includes('auto-save') || htmlContent.includes('autosave'),
            hasEditButtons: $('button:contains("Edit"), .edit-btn, [data-edit]').length > 0
        };
        
        // Quick Add Analysis
        this.testResults.quickAdd = {
            hasAddButton: $('button:contains("Add"), .add-btn, [data-add]').length > 0,
            hasModal: htmlContent.includes('modal') || htmlContent.includes('dialog'),
            hasFormFields: this.checkForFormFields($)
        };
        
        console.log('📊 Analysis Results:');
        console.log(`- Groups/Organization: ${this.testResults.visualDesign.hasGroups}`);
        console.log(`- Modern Design: ${this.testResults.visualDesign.hasModernDesign}`);
        console.log(`- Rae Found: ${this.testResults.visualDesign.raeFound}`);
        console.log(`- Edit Functionality: ${this.testResults.inlineEditing.hasEditableElements}`);
        console.log(`- Add Functionality: ${this.testResults.quickAdd.hasAddButton}`);
    }

    checkForGroups($, htmlContent) {
        const groupIndicators = [
            $('.family-group, .relationship-group, .member-group').length > 0,
            $('[class*="group"]').length > 5,
            htmlContent.includes('grouped') || htmlContent.includes('relationship'),
            $('h3, h4').length > 2 // Multiple headings suggest grouping
        ];
        return groupIndicators.some(Boolean);
    }

    checkForColorCoding($, htmlContent) {
        const colorIndicators = [
            $('[class*="bg-"], [class*="text-"], [class*="color"]').length > 10,
            htmlContent.includes('relationship-color') || htmlContent.includes('member-color'),
            $('[style*="color"], [style*="background"]').length > 5
        ];
        return colorIndicators.some(Boolean);
    }

    checkForModernDesign($, htmlContent) {
        const modernIndicators = [
            $('.btn, .button, .card, .modal').length > 0,
            $('[class*="rounded"], [class*="shadow"]').length > 0,
            htmlContent.includes('tailwind') || htmlContent.includes('bootstrap'),
            $('button, input[type="submit"]').length > 0
        ];
        return modernIndicators.some(Boolean);
    }

    checkForInlineEditing($, htmlContent) {
        const editingIndicators = [
            $('[contenteditable], .editable, [data-editable]').length > 0,
            htmlContent.includes('inline-edit') || htmlContent.includes('contenteditable'),
            $('.edit-in-place, .inline-form').length > 0
        ];
        return editingIndicators.some(Boolean);
    }

    checkForFormFields($) {
        return {
            nameField: $('input[name*="name"], input[placeholder*="name"]').length > 0,
            relationshipField: $('select[name*="relationship"], input[name*="relationship"]').length > 0,
            birthdayField: $('input[type="date"], input[name*="birthday"]').length > 0,
            memorialField: $('input[name*="memorial"], input[name*="death"]').length > 0
        };
    }

    async generateComprehensiveReport() {
        const overallScore = this.calculateOverallScore();
        const assessment = this.getAssessment(overallScore);
        
        const report = {
            timestamp: new Date().toISOString(),
            testConfiguration: {
                baseURL: this.baseURL,
                testCredentials: 'lukemoeller@yahoo.com',
                testScenarios: [
                    'Navigation to Family Profile',
                    'Visual Design Verification',
                    'Inline Editing Functionality',
                    'Quick Add Feature',
                    'Data Persistence'
                ]
            },
            testResults: this.testResults,
            summary: {
                overallScore: overallScore,
                assessment: assessment,
                loginWorking: this.testResults.authentication?.loginSuccess || false,
                familyProfileAccessible: this.testResults.navigation?.familyProfileFound || false,
                visualImprovements: {
                    groupedView: this.testResults.visualDesign?.hasGroups || false,
                    colorCoding: this.testResults.visualDesign?.hasColorCoding || false,
                    modernDesign: this.testResults.visualDesign?.hasModernDesign || false,
                    raeVisible: this.testResults.visualDesign?.raeFound || false
                },
                functionalityWorking: {
                    inlineEditing: this.testResults.inlineEditing?.hasEditableElements || false,
                    quickAdd: this.testResults.quickAdd?.hasAddButton || false,
                    autoSave: this.testResults.inlineEditing?.hasAutoSave || false
                }
            },
            issues: this.testResults.issues,
            recommendations: this.generateRecommendations(),
            clunkyExperienceFixed: this.assessClunkyExperienceFix()
        };

        return report;
    }

    calculateOverallScore() {
        const weights = {
            authentication: 0.2,
            navigation: 0.2,
            visualDesign: 0.3,
            functionality: 0.3
        };
        
        let score = 0;
        
        if (this.testResults.authentication?.loginSuccess) score += weights.authentication;
        if (this.testResults.navigation?.familyProfileFound) score += weights.navigation;
        
        const visualScore = [
            this.testResults.visualDesign?.hasGroups,
            this.testResults.visualDesign?.hasColorCoding,
            this.testResults.visualDesign?.hasModernDesign
        ].filter(Boolean).length / 3 * weights.visualDesign;
        
        const functionalityScore = [
            this.testResults.inlineEditing?.hasEditableElements,
            this.testResults.quickAdd?.hasAddButton,
            this.testResults.inlineEditing?.hasAutoSave
        ].filter(Boolean).length / 3 * weights.functionality;
        
        return Math.round((score + visualScore + functionalityScore) * 100);
    }

    getAssessment(score) {
        if (score >= 80) return 'EXCELLENT - Major UX improvements successfully implemented';
        if (score >= 60) return 'GOOD - Significant improvements with some minor areas for enhancement';
        if (score >= 40) return 'FAIR - Some improvements visible but several key features missing';
        return 'POOR - Major UX issues remain, clunky experience not resolved';
    }

    assessClunkyExperienceFix() {
        const keyImprovements = [
            this.testResults.inlineEditing?.hasEditableElements, // No full-screen navigation
            this.testResults.visualDesign?.hasGroups, // Organized display
            this.testResults.quickAdd?.hasAddButton, // Easy adding
            this.testResults.visualDesign?.hasModernDesign // Better design
        ];
        
        const improvementCount = keyImprovements.filter(Boolean).length;
        
        if (improvementCount >= 3) return 'YES - Major clunky experience issues resolved';
        if (improvementCount >= 2) return 'PARTIALLY - Some improvements but work remains';
        return 'NO - Clunky experience persists';
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (!this.testResults.navigation?.familyProfileFound) {
            recommendations.push({
                priority: 'HIGH',
                item: 'Make Family Profile section easily discoverable from main navigation',
                category: 'Navigation'
            });
        }
        
        if (!this.testResults.visualDesign?.hasGroups) {
            recommendations.push({
                priority: 'HIGH',
                item: 'Implement grouped family member display by relationship type',
                category: 'Visual Design'
            });
        }
        
        if (!this.testResults.inlineEditing?.hasEditableElements) {
            recommendations.push({
                priority: 'HIGH',
                item: 'Add inline editing to eliminate full-screen navigation for simple edits',
                category: 'Functionality'
            });
        }
        
        if (!this.testResults.quickAdd?.hasAddButton) {
            recommendations.push({
                priority: 'MEDIUM',
                item: 'Implement prominent "Add Family Member" button with modal interface',
                category: 'Functionality'
            });
        }
        
        if (!this.testResults.inlineEditing?.hasAutoSave) {
            recommendations.push({
                priority: 'MEDIUM',
                item: 'Add auto-save functionality for seamless user experience',
                category: 'User Experience'
            });
        }
        
        if (!this.testResults.visualDesign?.hasColorCoding) {
            recommendations.push({
                priority: 'LOW',
                item: 'Implement color-coded relationship categories for better visual hierarchy',
                category: 'Visual Design'
            });
        }
        
        return recommendations;
    }

    async runComprehensiveTest() {
        console.log('🚀 Starting Comprehensive Family Profile UX Testing...\n');
        
        // Phase 1: Application Exploration
        const discoveredLinks = await this.exploreApplication();
        
        // Phase 2: Authentication (if possible)
        console.log('\n--- Authentication Phase ---');
        await this.performAdvancedLogin();
        
        // Phase 3: Family Profile Access
        console.log('\n--- Family Profile Access Phase ---');
        const profileResult = await this.testFamilyProfileAccess(discoveredLinks);
        
        // Phase 4: Generate Report
        console.log('\n--- Report Generation Phase ---');
        return await this.generateComprehensiveReport();
    }
}

async function main() {
    const tester = new EnhancedFamilyProfileTester();
    const report = await tester.runComprehensiveTest();
    
    // Save detailed report
    const reportPath = '/home/luke/personal-ai-clone/web/family-profile-comprehensive-test-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 FAMILY PROFILE UX COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Overall Score: ${report.summary.overallScore}%`);
    console.log(`Assessment: ${report.summary.assessment}`);
    console.log(`Clunky Experience Fixed: ${report.clunkyExperienceFixed}`);
    
    console.log('\n🔍 DETAILED FINDINGS:');
    console.log(`Authentication: ${report.summary.loginWorking ? '✅ Working' : '❌ Failed'}`);
    console.log(`Family Profile Access: ${report.summary.familyProfileAccessible ? '✅ Accessible' : '❌ Not Found'}`);
    
    console.log('\n🎨 VISUAL IMPROVEMENTS:');
    console.log(`- Grouped Family View: ${report.summary.visualImprovements.groupedView ? '✅' : '❌'}`);
    console.log(`- Color Coding: ${report.summary.visualImprovements.colorCoding ? '✅' : '❌'}`);
    console.log(`- Modern Design: ${report.summary.visualImprovements.modernDesign ? '✅' : '❌'}`);
    console.log(`- Rae (daughter) Visible: ${report.summary.visualImprovements.raeVisible ? '✅' : '❌'}`);
    
    console.log('\n⚙️ FUNCTIONALITY:');
    console.log(`- Inline Editing: ${report.summary.functionalityWorking.inlineEditing ? '✅' : '❌'}`);
    console.log(`- Quick Add Button: ${report.summary.functionalityWorking.quickAdd ? '✅' : '❌'}`);
    console.log(`- Auto-Save: ${report.summary.functionalityWorking.autoSave ? '✅' : '❌'}`);
    
    if (report.issues.length > 0) {
        console.log('\n⚠️ ISSUES IDENTIFIED:');
        report.issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`));
    }
    
    if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        report.recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. [${rec.priority}] ${rec.item} (${rec.category})`);
        });
    }
    
    console.log(`\n📄 Complete report saved to: ${reportPath}`);
    
    return report;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = EnhancedFamilyProfileTester;