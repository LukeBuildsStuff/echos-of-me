const fs = require('fs');

function verifyFixApplied() {
  console.log('🔍 Verifying login loop fix has been applied...');
  
  try {
    // Read the .env.local file
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    
    let nextAuthUrl = null;
    let nextAuthSecret = null;
    
    lines.forEach(line => {
      if (line.startsWith('NEXTAUTH_URL=')) {
        nextAuthUrl = line.split('=')[1];
      }
      if (line.startsWith('NEXTAUTH_SECRET=')) {
        nextAuthSecret = line.split('=')[1] ? 'Set' : 'Not set';
      }
    });
    
    console.log('\n📋 Current Configuration:');
    console.log(`   NEXTAUTH_URL: ${nextAuthUrl}`);
    console.log(`   NEXTAUTH_SECRET: ${nextAuthSecret}`);
    
    // Verify the fix
    const fixApplied = nextAuthUrl === 'http://localhost:3000';
    
    console.log('\n🔬 Fix Verification:');
    if (fixApplied) {
      console.log('   ✅ NEXTAUTH_URL correctly set to http://localhost:3000');
      console.log('   ✅ Configuration fix has been applied successfully');
    } else {
      console.log('   ❌ NEXTAUTH_URL is still set to production domain');
      console.log('   ❌ Fix has NOT been applied correctly');
    }
    
    console.log('\n📋 Next Steps:');
    if (fixApplied) {
      console.log('   1. ✅ Configuration updated');
      console.log('   2. 🔄 Restart development server: docker-compose down && docker-compose up -d');  
      console.log('   3. 🧹 Clear browser cookies for localhost:3000');
      console.log('   4. 🧪 Test login flow with lukemoeller@yahoo.com / password123');
      console.log('   5. ✅ User should now be able to login successfully');
    } else {
      console.log('   1. ❌ Need to update NEXTAUTH_URL=http://localhost:3000 in .env.local');
      console.log('   2. 🔄 Then restart development server');
    }
    
    console.log('\n🎯 Expected Behavior After Fix:');
    console.log('   • User enters credentials on signin page');
    console.log('   • Authentication succeeds');
    console.log('   • User is redirected to dashboard');
    console.log('   • Dashboard loads without redirect loop');
    console.log('   • Session persists across page refreshes');
    console.log('   • Authenticated user visiting /auth/signin gets redirected to dashboard');
    
    return {
      fixApplied,
      nextAuthUrl,
      nextAuthSecret: nextAuthSecret === 'Set'
    };
    
  } catch (error) {
    console.log('❌ Error reading .env.local:', error.message);
    return { fixApplied: false, error: error.message };
  }
}

const result = verifyFixApplied();
console.log('\n📊 Verification complete.');

if (result.fixApplied) {
  console.log('\n🎉 SUCCESS: Login loop fix has been applied!');
  console.log('   The user should restart the server and test the login flow.');
} else {
  console.log('\n⚠️  WARNING: Fix needs to be applied or server needs restart.');
}