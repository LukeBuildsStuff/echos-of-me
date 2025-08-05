const bcrypt = require('bcryptjs');

async function testPasswordVerification() {
  console.log('🔐 Testing password verification...');
  
  const storedHash = '$2a$12$7Fg4V4lcIyX3L2olyL3fLuoq9h8kNtMzPBI0RnbOpSD0UhLa29iqy';
  const testPassword = 'password123';
  
  console.log(`Password: ${testPassword}`);
  console.log(`Hash: ${storedHash}`);
  
  try {
    const isValid = await bcrypt.compare(testPassword, storedHash);
    console.log(`✅ Password verification result: ${isValid ? 'VALID' : 'INVALID'}`);
    
    if (isValid) {
      console.log('🎉 Password matches! Authentication should work.');
    } else {
      console.log('❌ Password does not match stored hash.');
      
      // Test with other common passwords
      const commonPasswords = ['password', 'Password123', 'luke123', '123456'];
      console.log('\n🔍 Testing common passwords...');
      
      for (const pwd of commonPasswords) {
        const testResult = await bcrypt.compare(pwd, storedHash);
        console.log(`   • '${pwd}': ${testResult ? 'MATCH' : 'No match'}`);
        if (testResult) break;
      }
    }
    
  } catch (error) {
    console.log('❌ Error during password verification:', error.message);
  }
}

testPasswordVerification().catch(console.error);