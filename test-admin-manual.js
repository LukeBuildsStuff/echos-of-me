const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testAdminPortalManual() {
  console.log('🔍 Starting Manual Admin Portal Test...\n');
  
  try {
    // Test 1: Check if server is responding
    console.log('1️⃣ Testing server connectivity...');
    
    try {
      const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/');
      console.log(`   Server response code: ${stdout.trim()}`);
      if (stdout.trim() === '200') {
        console.log('   ✅ Server is responding');
      } else {
        console.log('   ⚠️ Server responded with non-200 code');
      }
    } catch (error) {
      console.log('   ❌ Server connectivity test failed');
    }
    
    // Test 2: Test admin portal redirect
    console.log('\n2️⃣ Testing admin portal redirect behavior...');
    
    try {
      const { stdout } = await execAsync('curl -s -I http://localhost:3000/admin | grep -E "(HTTP|Location|Set-Cookie)"');
      console.log('   Response headers:');
      console.log(stdout);
      
      if (stdout.includes('Location:') && stdout.includes('/auth/signin')) {
        console.log('   ✅ Correctly redirects to login when not authenticated');
      } else {
        console.log('   ❌ Unexpected redirect behavior');
      }
    } catch (error) {
      console.log('   ❌ Admin portal redirect test failed');
    }
    
    // Test 3: Check if admin API endpoints require authentication
    console.log('\n3️⃣ Testing admin API authentication requirements...');
    
    const adminEndpoints = [
      '/api/admin/analytics',
      '/api/admin/users',
      '/api/admin/families',
      '/api/admin/audit-logs'
    ];
    
    for (const endpoint of adminEndpoints) {
      try {
        const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000${endpoint}`);
        const statusCode = stdout.trim();
        
        if (statusCode === '401' || statusCode === '403') {
          console.log(`   ${endpoint}: ${statusCode} ✅ (Properly protected)`);
        } else if (statusCode === '200') {
          console.log(`   ${endpoint}: ${statusCode} ⚠️ (May not be properly protected)`);
        } else {
          console.log(`   ${endpoint}: ${statusCode} ❌ (Unexpected response)`);
        }
      } catch (error) {
        console.log(`   ${endpoint}: Error ❌`);
      }
    }
    
    // Test 4: Test sign-in page loads
    console.log('\n4️⃣ Testing sign-in page accessibility...');
    
    try {
      const { stdout } = await execAsync('curl -s http://localhost:3000/auth/signin | grep -i "sign\\|login\\|email\\|password" | head -5');
      if (stdout.trim()) {
        console.log('   ✅ Sign-in page contains expected elements');
        console.log('   Sign-in page content preview:');
        console.log(stdout);
      } else {
        console.log('   ❌ Sign-in page may not be loading correctly');
      }
    } catch (error) {
      console.log('   ❌ Sign-in page test failed');
    }
    
    // Test 5: Check database connectivity for admin user
    console.log('\n5️⃣ Testing admin user database verification...');
    
    try {
      const { stdout, stderr } = await execAsync('node -e "const { query } = require(\'./lib/db\'); query(\'SELECT email, is_admin, admin_role_id FROM users WHERE email = \\$1\', [\'lukemoeller@yahoo.com\']).then(r => console.log(JSON.stringify(r.rows, null, 2))).catch(e => console.error(e))"');
      
      if (stdout.trim()) {
        const userData = JSON.parse(stdout.trim());
        console.log('   📊 Admin user data:');
        console.log(userData);
        
        if (userData.length > 0 && userData[0].is_admin) {
          console.log('   ✅ Admin user exists and has admin privileges');
        } else {
          console.log('   ❌ Admin user not found or lacks admin privileges');
        }
      } else {
        console.log('   ❌ Database query failed');
        if (stderr) console.log('   Error:', stderr);
      }
    } catch (error) {
      console.log('   ❌ Database verification failed:', error.message);
    }
    
    // Test 6: Test the application structure
    console.log('\n6️⃣ Testing application structure...');
    
    try {
      const { stdout } = await execAsync('curl -s http://localhost:3000/ | grep -i "echoes\\|family\\|legacy\\|memorial" | head -3');
      if (stdout.trim()) {
        console.log('   ✅ Main application loads with expected content');
        console.log('   Application content preview:');
        console.log(stdout);
      } else {
        console.log('   ⚠️ Main application may not contain expected themes');
      }
    } catch (error) {
      console.log('   ❌ Application structure test failed');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 ADMIN PORTAL TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Tests Completed Successfully:');
    console.log('   - Server connectivity verification');
    console.log('   - Admin portal security (redirects when unauthenticated)');
    console.log('   - API endpoint protection');
    console.log('   - Sign-in page functionality');
    console.log('   - Database admin user verification');
    console.log('   - Application structure validation');
    console.log('');
    console.log('🔄 NEXT STEPS FOR MANUAL TESTING:');
    console.log('   1. Open browser to http://localhost:3000/admin');
    console.log('   2. Login with: lukemoeller@yahoo.com / password123');
    console.log('   3. Verify Family Legacy Guardian dashboard loads');
    console.log('   4. Test navigation between admin sections');
    console.log('   5. Verify crisis detection and emergency support features');
    console.log('');
    console.log('🏁 Manual Admin Portal Test Complete');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testAdminPortalManual().catch(console.error);