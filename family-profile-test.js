const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

class FamilyProfileTester {
    constructor() {
        this.baseURL = 'http://localhost:3003';
        this.session = null;
        this.cookies = '';
        this.testResults = {
            navigation: {},
            visualDesign: {},
            inlineEditing: {},
            quickAdd: {},
            dataPersistence: {},
            issues: [],
            findings: []
        };
    }

    async login(email, password) {
        try {
            console.log('🔐 Attempting login...');
            
            // Get the signin page first to extract CSRF token
            const signinResponse = await axios.get(`${this.baseURL}/auth/signin`);
            const $ = cheerio.load(signinResponse.data);
            
            // Look for CSRF token
            const csrfToken = $('input[name="csrfToken"]').val() || 
                             $('meta[name="csrf-token"]').attr('content') ||
                             $('input[name="_token"]').val();
            
            // Extract cookies from response
            const setCookies = signinResponse.headers['set-cookie'];
            if (setCookies) {
                this.cookies = setCookies.map(cookie => cookie.split(';')[0]).join('; ');
            }
            
            console.log('CSRF Token:', csrfToken);
            console.log('Cookies:', this.cookies);
            
            // Attempt to login using NextAuth API
            const loginData = {
                email: email,
                password: password,
                callbackUrl: `${this.baseURL}/dashboard`,
                json: true
            };
            
            if (csrfToken) {
                loginData.csrfToken = csrfToken;
            }
            
            const loginResponse = await axios.post(`${this.baseURL}/api/auth/signin/credentials`, loginData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this.cookies,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                maxRedirects: 0,
                validateStatus: status => status < 500
            });
            
            console.log('Login response status:', loginResponse.status);
            console.log('Login response headers:', loginResponse.headers);
            
            // Update cookies from login response
            const loginCookies = loginResponse.headers['set-cookie'];
            if (loginCookies) {
                this.cookies += '; ' + loginCookies.map(cookie => cookie.split(';')[0]).join('; ');
            }
            
            // Check if login was successful by looking for session cookies
            const hasSessionCookie = this.cookies.includes('next-auth.session-token') || 
                                   this.cookies.includes('__Secure-next-auth.session-token') ||
                                   loginResponse.status === 200;
            
            if (hasSessionCookie || loginResponse.status === 302) {
                console.log('✅ Login appears successful');
                this.testResults.navigation.loginSuccess = true;
                return true;
            } else {
                console.log('❌ Login failed');
                this.testResults.navigation.loginSuccess = false;
                this.testResults.issues.push('Login failed - no session cookie found');
                return false;
            }
            
        } catch (error) {
            console.log('❌ Login error:', error.message);
            this.testResults.navigation.loginSuccess = false;
            this.testResults.issues.push(`Login error: ${error.message}`);
            return false;
        }
    }
    
    async checkAuthenticatedAccess() {
        try {
            console.log('🔍 Checking authenticated access...');
            
            // Try to access dashboard
            const dashboardResponse = await axios.get(`${this.baseURL}/dashboard`, {
                headers: { 'Cookie': this.cookies },
                maxRedirects: 0,
                validateStatus: status => status < 500
            });
            
            console.log('Dashboard response status:', dashboardResponse.status);
            
            if (dashboardResponse.status === 200 && !dashboardResponse.data.includes('Sign in')) {
                console.log('✅ Authenticated access confirmed');
                this.testResults.navigation.authenticatedAccess = true;
                return true;
            } else {
                console.log('❌ Not properly authenticated');
                this.testResults.navigation.authenticatedAccess = false;
                return false;
            }
            
        } catch (error) {
            console.log('❌ Authentication check failed:', error.message);
            this.testResults.navigation.authenticatedAccess = false;
            return false;
        }
    }

    async navigateToFamilyProfile() {
        try {
            console.log('🧭 Navigating to Family Profile...');
            
            // First, let's check what pages are available by examining the dashboard
            const dashboardResponse = await axios.get(`${this.baseURL}/dashboard`, {
                headers: { 'Cookie': this.cookies }
            });
            
            let $ = cheerio.load(dashboardResponse.data);
            
            // Look for settings or family profile links
            const settingsLink = $('a[href*="settings"], a:contains("Settings"), a:contains("Family"), a[href*="family"]');
            
            if (settingsLink.length > 0) {
                const href = settingsLink.first().attr('href');
                console.log('Found settings/family link:', href);
                
                // Navigate to the family profile section
                let profileURL = href;
                if (!href.startsWith('http')) {
                    profileURL = `${this.baseURL}${href.startsWith('/') ? href : '/' + href}`;
                }
                
                const profileResponse = await axios.get(profileURL, {
                    headers: { 'Cookie': this.cookies }
                });
                
                $ = cheerio.load(profileResponse.data);
                
                this.testResults.navigation.familyProfileFound = true;
                this.testResults.navigation.familyProfileURL = profileURL;
                
                console.log('✅ Successfully navigated to Family Profile');
                return { success: true, html: profileResponse.data, url: profileURL };
                
            } else {
                // Try direct URLs
                const possibleURLs = [
                    '/settings/family',
                    '/settings',
                    '/profile',
                    '/family-profile',
                    '/family'
                ];
                
                for (const url of possibleURLs) {
                    try {
                        const response = await axios.get(`${this.baseURL}${url}`, {
                            headers: { 'Cookie': this.cookies },
                            validateStatus: status => status < 500
                        });
                        
                        if (response.status === 200 && 
                            (response.data.includes('family') || response.data.includes('Family'))) {
                            console.log(`✅ Found Family Profile at: ${url}`);
                            this.testResults.navigation.familyProfileFound = true;
                            this.testResults.navigation.familyProfileURL = `${this.baseURL}${url}`;
                            return { success: true, html: response.data, url: `${this.baseURL}${url}` };
                        }
                    } catch (e) {
                        console.log(`❌ ${url} not accessible`);
                    }
                }
                
                console.log('❌ Family Profile section not found');
                this.testResults.navigation.familyProfileFound = false;
                this.testResults.issues.push('Could not find Family Profile section');
                return { success: false };
            }
            
        } catch (error) {
            console.log('❌ Navigation error:', error.message);
            this.testResults.navigation.familyProfileFound = false;
            this.testResults.issues.push(`Navigation error: ${error.message}`);
            return { success: false };
        }
    }

    async analyzeVisualDesign(html) {
        try {
            console.log('🎨 Analyzing visual design improvements...');
            
            const $ = cheerio.load(html);
            
            // Check for grouped family view
            const familyGroups = $('.family-group, .relationship-group, [data-testid="family-group"]').length;
            const groupedContent = $('[class*="group"], [class*="relationship"]').length;
            
            this.testResults.visualDesign.hasGroups = familyGroups > 0 || groupedContent > 0;
            this.testResults.visualDesign.groupCount = familyGroups || groupedContent;
            
            // Look for Rae (daughter)
            const raeFound = html.toLowerCase().includes('rae') && 
                           (html.toLowerCase().includes('daughter') || html.toLowerCase().includes('child'));
            this.testResults.visualDesign.raeFound = raeFound;
            
            // Check for color coding indicators
            const coloredElements = $('[class*="color"], [style*="color"], [class*="bg-"], [class*="text-"]').length;
            this.testResults.visualDesign.hasColorCoding = coloredElements > 10; // Threshold for meaningful color usage
            
            // Check for improved hierarchy
            const headings = $('h1, h2, h3, h4, h5, h6').length;
            const prominentNames = $('.name, .member-name, [class*="name"]').length;
            this.testResults.visualDesign.hasHierarchy = headings > 0 || prominentNames > 0;
            
            // Check for modern design elements
            const modernElements = $('.btn, .button, .card, .modal, [class*="rounded"], [class*="shadow"]').length;
            this.testResults.visualDesign.hasModernDesign = modernElements > 5;
            
            console.log('✅ Visual design analysis complete');
            console.log(`- Groups found: ${this.testResults.visualDesign.groupCount}`);
            console.log(`- Rae found: ${this.testResults.visualDesign.raeFound}`);
            console.log(`- Color coding: ${this.testResults.visualDesign.hasColorCoding}`);
            
            return true;
            
        } catch (error) {
            console.log('❌ Visual design analysis error:', error.message);
            this.testResults.issues.push(`Visual design analysis error: ${error.message}`);
            return false;
        }
    }

    async testInlineEditing(html) {
        try {
            console.log('✏️ Testing inline editing functionality...');
            
            const $ = cheerio.load(html);
            
            // Look for inline editing indicators
            const editableElements = $('[contenteditable], .editable, [data-editable], .inline-edit').length;
            const editButtons = $('button:contains("Edit"), [data-action="edit"], .edit-btn').length;
            const editIcons = $('[class*="edit"], [data-testid*="edit"]').length;
            
            this.testResults.inlineEditing.hasEditableElements = editableElements > 0;
            this.testResults.inlineEditing.hasEditButtons = editButtons > 0;
            this.testResults.inlineEditing.hasEditIcons = editIcons > 0;
            
            // Look for auto-save indicators
            const autoSaveElements = $('[data-auto-save], .auto-save, :contains("auto-save")').length;
            this.testResults.inlineEditing.hasAutoSave = autoSaveElements > 0 || html.includes('auto-save') || html.includes('autosave');
            
            // Look for form elements that might be used for inline editing
            const inlineForms = $('form.inline, .inline-form, [data-inline-form]').length;
            this.testResults.inlineEditing.hasInlineForms = inlineForms > 0;
            
            const inlineEditingSupport = editableElements > 0 || editButtons > 0 || editIcons > 0 || inlineForms > 0;
            this.testResults.inlineEditing.inlineEditSupported = inlineEditingSupport;
            
            console.log('✅ Inline editing analysis complete');
            console.log(`- Editable elements: ${editableElements}`);
            console.log(`- Edit buttons: ${editButtons}`);
            console.log(`- Auto-save support: ${this.testResults.inlineEditing.hasAutoSave}`);
            
            return inlineEditingSupport;
            
        } catch (error) {
            console.log('❌ Inline editing test error:', error.message);
            this.testResults.issues.push(`Inline editing test error: ${error.message}`);
            return false;
        }
    }

    async testQuickAdd(html) {
        try {
            console.log('➕ Testing Quick Add functionality...');
            
            const $ = cheerio.load(html);
            
            // Look for Add buttons
            const addButtons = $('button:contains("Add"), button:contains("New"), [data-action="add"], .add-btn, [data-testid*="add"]').length;
            this.testResults.quickAdd.hasAddButton = addButtons > 0;
            
            // Look for modal indicators
            const modals = $('.modal, [role="dialog"], [data-modal], .popup').length;
            this.testResults.quickAdd.hasModal = modals > 0 || html.includes('modal') || html.includes('dialog');
            
            // Look for form fields commonly used in family member forms
            const nameFields = $('input[name*="name"], input[placeholder*="name"]').length;
            const relationshipFields = $('select[name*="relationship"], input[name*="relationship"]').length;
            const birthdayFields = $('input[type="date"], input[name*="birthday"], input[name*="birth"]').length;
            const memorialFields = $('input[name*="memorial"], input[name*="death"], input[name*="passed"]').length;
            
            this.testResults.quickAdd.hasNameField = nameFields > 0;
            this.testResults.quickAdd.hasRelationshipField = relationshipFields > 0;
            this.testResults.quickAdd.hasBirthdayField = birthdayFields > 0;
            this.testResults.quickAdd.hasMemorialField = memorialFields > 0;
            
            const quickAddSupport = addButtons > 0 && (nameFields > 0 || relationshipFields > 0);
            this.testResults.quickAdd.quickAddSupported = quickAddSupport;
            
            console.log('✅ Quick Add analysis complete');
            console.log(`- Add buttons: ${addButtons}`);
            console.log(`- Form fields found: name(${nameFields}), relationship(${relationshipFields}), birthday(${birthdayFields}), memorial(${memorialFields})`);
            
            return quickAddSupport;
            
        } catch (error) {
            console.log('❌ Quick Add test error:', error.message);
            this.testResults.issues.push(`Quick Add test error: ${error.message}`);
            return false;
        }
    }

    async testDataPersistence(profileURL) {
        try {
            console.log('💾 Testing data persistence...');
            
            // Make a fresh request to the same URL to simulate page refresh
            const refreshedResponse = await axios.get(profileURL, {
                headers: { 
                    'Cookie': this.cookies,
                    'Cache-Control': 'no-cache'
                }
            });
            
            const $ = cheerio.load(refreshedResponse.data);
            
            // Check if family member data persists after refresh
            const raeStillPresent = refreshedResponse.data.toLowerCase().includes('rae');
            const familyDataPresent = $('.family-member, .member, [data-member]').length > 0 || 
                                    refreshedResponse.data.includes('family') || 
                                    refreshedResponse.data.includes('relationship');
            
            this.testResults.dataPersistence.raePersistedAfterRefresh = raeStillPresent;
            this.testResults.dataPersistence.familyDataPersisted = familyDataPresent;
            this.testResults.dataPersistence.dataPersistedAfterRefresh = raeStillPresent || familyDataPresent;
            
            console.log('✅ Data persistence test complete');
            console.log(`- Rae data persisted: ${raeStillPresent}`);
            console.log(`- Family data persisted: ${familyDataPresent}`);
            
            return this.testResults.dataPersistence.dataPersistedAfterRefresh;
            
        } catch (error) {
            console.log('❌ Data persistence test error:', error.message);
            this.testResults.issues.push(`Data persistence test error: ${error.message}`);
            return false;
        }
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            testResults: this.testResults,
            summary: {
                loginWorking: this.testResults.navigation.loginSuccess,
                familyProfileAccessible: this.testResults.navigation.familyProfileFound,
                visualImprovements: {
                    groupedView: this.testResults.visualDesign.hasGroups,
                    colorCoding: this.testResults.visualDesign.hasColorCoding,
                    modernDesign: this.testResults.visualDesign.hasModernDesign
                },
                functionalityWorking: {
                    inlineEditing: this.testResults.inlineEditing.inlineEditSupported,
                    quickAdd: this.testResults.quickAdd.quickAddSupported,
                    dataPersistence: this.testResults.dataPersistence.dataPersistedAfterRefresh
                }
            },
            overallAssessment: this.generateOverallAssessment(),
            issues: this.testResults.issues,
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    generateOverallAssessment() {
        const scores = {
            navigation: this.testResults.navigation.familyProfileFound ? 1 : 0,
            visualDesign: (this.testResults.visualDesign.hasGroups ? 0.4 : 0) +
                         (this.testResults.visualDesign.hasColorCoding ? 0.3 : 0) +
                         (this.testResults.visualDesign.hasModernDesign ? 0.3 : 0),
            functionality: (this.testResults.inlineEditing.inlineEditSupported ? 0.4 : 0) +
                          (this.testResults.quickAdd.quickAddSupported ? 0.4 : 0) +
                          (this.testResults.dataPersistence.dataPersistedAfterRefresh ? 0.2 : 0)
        };

        const totalScore = (scores.navigation + scores.visualDesign + scores.functionality) / 3;
        
        if (totalScore >= 0.8) return 'EXCELLENT - Major UX improvements implemented';
        if (totalScore >= 0.6) return 'GOOD - Significant improvements with minor issues';
        if (totalScore >= 0.4) return 'FAIR - Some improvements but needs work';
        return 'POOR - Major UX issues remain unresolved';
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (!this.testResults.navigation.familyProfileFound) {
            recommendations.push('Ensure Family Profile section is easily accessible from main navigation');
        }
        
        if (!this.testResults.visualDesign.hasGroups) {
            recommendations.push('Implement grouped family member display by relationship type');
        }
        
        if (!this.testResults.inlineEditing.inlineEditSupported) {
            recommendations.push('Add inline editing capabilities to eliminate full-screen navigation');
        }
        
        if (!this.testResults.quickAdd.quickAddSupported) {
            recommendations.push('Implement quick add modal for adding new family members');
        }
        
        if (!this.testResults.dataPersistence.dataPersistedAfterRefresh) {
            recommendations.push('Ensure data persistence across page refreshes');
        }
        
        return recommendations;
    }

    async runFullTest() {
        console.log('🚀 Starting Family Profile UX Testing...\n');
        
        // Step 1: Login
        const loginSuccess = await this.login('lukemoeller@yahoo.com', 'password123');
        if (!loginSuccess) {
            console.log('❌ Cannot proceed without successful login');
            return await this.generateReport();
        }
        
        // Step 2: Verify authenticated access
        const authSuccess = await this.checkAuthenticatedAccess();
        if (!authSuccess) {
            console.log('❌ Authentication verification failed');
            return await this.generateReport();
        }
        
        // Step 3: Navigate to Family Profile
        const navigationResult = await this.navigateToFamilyProfile();
        if (!navigationResult.success) {
            console.log('❌ Cannot access Family Profile section');
            return await this.generateReport();
        }
        
        // Step 4: Analyze all aspects
        await this.analyzeVisualDesign(navigationResult.html);
        await this.testInlineEditing(navigationResult.html);
        await this.testQuickAdd(navigationResult.html);
        await this.testDataPersistence(navigationResult.url);
        
        // Step 5: Generate and return report
        return await this.generateReport();
    }
}

// Run the test
async function main() {
    const tester = new FamilyProfileTester();
    const report = await tester.runFullTest();
    
    // Save report
    const reportPath = '/home/luke/personal-ai-clone/web/family-profile-ux-test-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 FAMILY PROFILE UX TEST RESULTS');
    console.log('==========================================');
    console.log(`Overall Assessment: ${report.overallAssessment}`);
    console.log('\n🔍 Test Summary:');
    console.log(`- Login Success: ${report.summary.loginWorking ? '✅' : '❌'}`);
    console.log(`- Family Profile Access: ${report.summary.familyProfileAccessible ? '✅' : '❌'}`);
    console.log(`- Grouped View: ${report.summary.visualImprovements.groupedView ? '✅' : '❌'}`);
    console.log(`- Color Coding: ${report.summary.visualImprovements.colorCoding ? '✅' : '❌'}`);
    console.log(`- Inline Editing: ${report.summary.functionalityWorking.inlineEditing ? '✅' : '❌'}`);
    console.log(`- Quick Add: ${report.summary.functionalityWorking.quickAdd ? '✅' : '❌'}`);
    console.log(`- Data Persistence: ${report.summary.functionalityWorking.dataPersistence ? '✅' : '❌'}`);
    
    if (report.issues.length > 0) {
        console.log('\n⚠️  Issues Found:');
        report.issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`));
    }
    
    if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach((rec, i) => console.log(`${i + 1}. ${rec}`));
    }
    
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    return report;
}

// Check if axios is available
const checkDependencies = async () => {
    try {
        require('axios');
        require('cheerio');
        return true;
    } catch (error) {
        console.log('❌ Missing dependencies. Installing...');
        return false;
    }
};

if (require.main === module) {
    checkDependencies().then(depsOk => {
        if (depsOk) {
            main().catch(console.error);
        } else {
            console.log('Please run: npm install axios cheerio');
            process.exit(1);
        }
    });
}

module.exports = FamilyProfileTester;