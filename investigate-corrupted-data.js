const { Pool } = require('pg');

async function investigateCorruptedData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev",
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('=== INVESTIGATING CORRUPTED FAMILY DATA ===\n');
    
    // Check for users with corrupted JSON data
    const corruptedDataCheck = await pool.query(`
      SELECT 
        email,
        name,
        important_people,
        length(important_people::text) as data_length,
        left(important_people::text, 50) as data_preview
      FROM users 
      WHERE important_people IS NOT NULL 
        AND important_people != ''
      ORDER BY created_at DESC;
    `);
    
    console.log('=== USERS WITH FAMILY DATA ===');
    for (const user of corruptedDataCheck.rows) {
      console.log(`\nUser: ${user.email}`);
      console.log(`Name: ${user.name}`);
      console.log(`Data Length: ${user.data_length}`);
      console.log(`Preview: ${user.data_preview}...`);
      
      // Try to parse the JSON
      try {
        const parsed = JSON.parse(user.important_people);
        console.log(`✅ JSON Valid - Family Members: ${Array.isArray(parsed) ? parsed.length : 'Not array'}`);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((member, idx) => {
            console.log(`  ${idx + 1}. ${member.name || 'NO NAME'} (${member.relationship || 'NO RELATIONSHIP'})`);
          });
        }
      } catch (e) {
        console.log(`❌ JSON Invalid: ${e.message}`);
        
        // Show raw data for debugging
        console.log(`Raw Data (first 100 chars): ${user.important_people.toString().substring(0, 100)}`);
        
        // Try to find the issue
        const dataStr = user.important_people.toString();
        if (dataStr.includes('\n')) {
          console.log(`⚠️  Contains newlines`);
        }
        if (dataStr.includes('\r')) {
          console.log(`⚠️  Contains carriage returns`);
        }
        if (dataStr.includes('\t')) {
          console.log(`⚠️  Contains tabs`);
        }
        
        // Check if it's truncated
        const brackets = (dataStr.match(/\[/g) || []).length;
        const closingBrackets = (dataStr.match(/\]/g) || []).length;
        console.log(`Brackets: [ count: ${brackets}, ] count: ${closingBrackets}`);
        
        const braces = (dataStr.match(/\{/g) || []).length;
        const closingBraces = (dataStr.match(/\}/g) || []).length;
        console.log(`Braces: { count: ${braces}, } count: ${closingBraces}`);
      }
    }

    // Check if there are any users without family data for comparison
    const noFamilyDataCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE important_people IS NULL OR important_people = '' OR important_people = '[]';
    `);
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Users with family data: ${corruptedDataCheck.rows.length}`);
    console.log(`Users without family data: ${noFamilyDataCheck.rows[0].count}`);

    // Test creating a fresh family member entry
    console.log(`\n=== TESTING FRESH FAMILY MEMBER CREATION ===`);
    const testMember = {
      name: 'Test Member',
      relationship: 'Test',
      birthday: null,
      memorial_date: null
    };
    const testArray = [testMember];
    const testJson = JSON.stringify(testArray);
    
    console.log(`Test JSON: ${testJson}`);
    console.log(`Test JSON Length: ${testJson.length}`);
    
    try {
      JSON.parse(testJson);
      console.log(`✅ Test JSON is valid`);
    } catch (e) {
      console.log(`❌ Test JSON is invalid: ${e.message}`);
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

investigateCorruptedData().catch(console.error);