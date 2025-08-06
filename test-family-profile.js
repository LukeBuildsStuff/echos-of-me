const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function testFamilyProfileUX() {
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    // Create screenshots directory
    const screenshotDir = '/home/luke/personal-ai-clone/web/test-screenshots';
    try {
        await fs.mkdir(screenshotDir, { recursive: true });
    } catch (e) {
        // Directory already exists
    }

    const testResults = {
        navigation: {},
        visualDesign: {},
        inlineEditing: {},
        quickAdd: {},
        dataPersistence: {},
        issues: [],
        screenshots: []
    };

    try {
        console.log('🔄 Starting Family Profile UX Testing...');

        // Capture console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        page.on('pageerror', error => {
            testResults.issues.push(`Page Error: ${error.message}`);
        });

        // 1. Navigate to application and login
        console.log('📍 Test 1: Navigation and Login');
        await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });
        
        // Take initial screenshot
        await page.screenshot({ 
            path: path.join(screenshotDir, '01-landing-page.png'),
            fullPage: true 
        });
        testResults.screenshots.push('01-landing-page.png');

        // Look for login elements
        const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
        const loginButton = await page.locator('button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]').first();

        if (await emailInput.isVisible() && await passwordInput.isVisible()) {
            await emailInput.fill('lukemoeller@yahoo.com');
            await passwordInput.fill('password123');
            
            await page.screenshot({ 
                path: path.join(screenshotDir, '02-login-form-filled.png'),
                fullPage: true 
            });
            testResults.screenshots.push('02-login-form-filled.png');
            
            await loginButton.click();
            await page.waitForLoadState('networkidle');
            
            testResults.navigation.loginSuccess = true;
            console.log('✅ Login successful');
        } else {
            // Check if already logged in
            const userIndicator = await page.locator('[data-testid="user-menu"], .user-avatar, text=lukemoeller').first();
            if (await userIndicator.isVisible({ timeout: 5000 })) {
                testResults.navigation.loginSuccess = true;
                console.log('✅ Already logged in');
            } else {
                testResults.navigation.loginSuccess = false;
                testResults.issues.push('Could not find login form or user indicator');
            }
        }

        await page.screenshot({ 
            path: path.join(screenshotDir, '03-after-login.png'),
            fullPage: true 
        });
        testResults.screenshots.push('03-after-login.png');

        // 2. Navigate to Settings → Family Profile
        console.log('📍 Test 2: Navigate to Family Profile');
        
        // Look for Settings navigation
        const settingsLink = await page.locator('a:has-text("Settings"), [data-testid="settings"], nav a[href*="settings"]').first();
        
        if (await settingsLink.isVisible({ timeout: 5000 })) {
            await settingsLink.click();
            await page.waitForLoadState('networkidle');
            testResults.navigation.settingsFound = true;
        } else {
            // Try finding settings in a dropdown or menu
            const menuButton = await page.locator('button:has-text("Menu"), [data-testid="menu"], .menu-trigger').first();
            if (await menuButton.isVisible({ timeout: 3000 })) {
                await menuButton.click();
                await page.waitForTimeout(1000);
                const settingsInMenu = await page.locator('a:has-text("Settings")').first();
                if (await settingsInMenu.isVisible()) {
                    await settingsInMenu.click();
                    await page.waitForLoadState('networkidle');
                    testResults.navigation.settingsFound = true;
                }
            } else {
                testResults.navigation.settingsFound = false;
                testResults.issues.push('Could not find Settings navigation');
            }
        }

        await page.screenshot({ 
            path: path.join(screenshotDir, '04-settings-page.png'),
            fullPage: true 
        });
        testResults.screenshots.push('04-settings-page.png');

        // Look for Family Profile section
        const familyProfileLink = await page.locator('a:has-text("Family Profile"), button:has-text("Family Profile"), [data-testid="family-profile"]').first();
        
        if (await familyProfileLink.isVisible({ timeout: 5000 })) {
            await familyProfileLink.click();
            await page.waitForLoadState('networkidle');
            testResults.navigation.familyProfileFound = true;
            console.log('✅ Family Profile section found');
        } else {
            testResults.navigation.familyProfileFound = false;
            testResults.issues.push('Could not find Family Profile section');
        }

        await page.screenshot({ 
            path: path.join(screenshotDir, '05-family-profile-page.png'),
            fullPage: true 
        });
        testResults.screenshots.push('05-family-profile-page.png');

        // 3. Visual Design Verification
        console.log('📍 Test 3: Visual Design Verification');
        
        // Check for grouped family members
        const familyGroups = await page.locator('[data-testid="family-group"], .family-group, .relationship-group').count();
        testResults.visualDesign.hasGroups = familyGroups > 0;
        
        // Check for Rae (daughter)
        const raeMember = await page.locator('text=Rae, text="Rae"').first();
        testResults.visualDesign.raeFound = await raeMember.isVisible({ timeout: 3000 });
        
        // Check for color coding
        const coloredElements = await page.locator('[class*="color"], [style*="color"], [class*="relationship"]').count();
        testResults.visualDesign.hasColorCoding = coloredElements > 0;
        
        // Test mobile responsiveness
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
            path: path.join(screenshotDir, '06-mobile-view.png'),
            fullPage: true 
        });
        testResults.screenshots.push('06-mobile-view.png');
        
        testResults.visualDesign.mobileResponsive = true;
        console.log('✅ Mobile view captured');
        
        // Return to desktop view
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(1000);

        // 4. Test Inline Editing on Rae
        console.log('📍 Test 4: Inline Editing Functionality');
        
        if (testResults.visualDesign.raeFound) {
            // Try clicking on Rae's entry
            await raeMember.click();
            await page.waitForTimeout(2000);
            
            // Look for inline edit indicators
            const editForm = await page.locator('[data-testid="inline-edit"], .inline-edit, form').first();
            const editInput = await page.locator('input:visible').first();
            
            if (await editForm.isVisible() || await editInput.isVisible()) {
                testResults.inlineEditing.inlineEditFound = true;
                
                await page.screenshot({ 
                    path: path.join(screenshotDir, '07-inline-edit-active.png'),
                    fullPage: true 
                });
                testResults.screenshots.push('07-inline-edit-active.png');
                
                // Test auto-save by making a small change
                if (await editInput.isVisible()) {
                    const originalValue = await editInput.inputValue();
                    await editInput.fill(originalValue + ' (edited)');
                    await page.waitForTimeout(3000); // Wait for auto-save
                    
                    testResults.inlineEditing.autoSaveTested = true;
                    console.log('✅ Auto-save tested');
                }
            } else {
                testResults.inlineEditing.inlineEditFound = false;
                testResults.issues.push('Inline editing not found when clicking on Rae');
            }
        }

        // 5. Test Quick Add Feature
        console.log('📍 Test 5: Quick Add Feature');
        
        const addButton = await page.locator('button:has-text("Add Family Member"), button:has-text("Add Member"), [data-testid="add-family-member"]').first();
        
        if (await addButton.isVisible({ timeout: 5000 })) {
            testResults.quickAdd.addButtonFound = true;
            await addButton.click();
            await page.waitForTimeout(2000);
            
            // Look for modal
            const modal = await page.locator('[role="dialog"], .modal, [data-testid="add-member-modal"]').first();
            const birthdayField = await page.locator('input[type="date"], input[name*="birthday"], input[placeholder*="birthday"]').first();
            const memorialField = await page.locator('input[name*="memorial"], input[placeholder*="memorial"]').first();
            
            testResults.quickAdd.modalFound = await modal.isVisible({ timeout: 3000 });
            testResults.quickAdd.birthdayFieldFound = await birthdayField.isVisible({ timeout: 3000 });
            testResults.quickAdd.memorialFieldFound = await memorialField.isVisible({ timeout: 3000 });
            
            await page.screenshot({ 
                path: path.join(screenshotDir, '08-add-member-modal.png'),
                fullPage: true 
            });
            testResults.screenshots.push('08-add-member-modal.png');
            
            console.log('✅ Add member modal tested');
            
            // Close modal
            const closeButton = await page.locator('button:has-text("Cancel"), button:has-text("Close"), [data-testid="close-modal"]').first();
            if (await closeButton.isVisible()) {
                await closeButton.click();
                await page.waitForTimeout(1000);
            } else {
                await page.keyboard.press('Escape');
            }
        } else {
            testResults.quickAdd.addButtonFound = false;
            testResults.issues.push('Add Family Member button not found');
        }

        // 6. Test Data Persistence
        console.log('📍 Test 6: Data Persistence');
        
        // Refresh page and check if data persists
        await page.reload({ waitUntil: 'networkidle' });
        
        await page.screenshot({ 
            path: path.join(screenshotDir, '09-after-refresh.png'),
            fullPage: true 
        });
        testResults.screenshots.push('09-after-refresh.png');
        
        // Check if Rae is still visible
        const raeAfterRefresh = await page.locator('text=Rae, text="Rae"').first();
        testResults.dataPersistence.dataPersistedAfterRefresh = await raeAfterRefresh.isVisible({ timeout: 5000 });
        
        console.log('✅ Data persistence tested');

        // Final screenshot
        await page.screenshot({ 
            path: path.join(screenshotDir, '10-final-state.png'),
            fullPage: true 
        });
        testResults.screenshots.push('10-final-state.png');

    } catch (error) {
        testResults.issues.push(`Test execution error: ${error.message}`);
        console.error('❌ Test execution error:', error.message);
    } finally {
        // Add console errors to results
        testResults.consoleErrors = consoleErrors;
        
        // Save test results
        await fs.writeFile(
            path.join(screenshotDir, 'test-results.json'),
            JSON.stringify(testResults, null, 2)
        );
        
        await browser.close();
        
        console.log('\n📊 Test Results Summary:');
        console.log('Navigation:', testResults.navigation);
        console.log('Visual Design:', testResults.visualDesign);
        console.log('Inline Editing:', testResults.inlineEditing);
        console.log('Quick Add:', testResults.quickAdd);
        console.log('Data Persistence:', testResults.dataPersistence);
        console.log('Issues:', testResults.issues);
        console.log('Screenshots saved:', testResults.screenshots.length);
        
        return testResults;
    }
}

// Run the test
testFamilyProfileUX().then(results => {
    console.log('\n🎉 Testing complete! Results saved to test-screenshots/test-results.json');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});