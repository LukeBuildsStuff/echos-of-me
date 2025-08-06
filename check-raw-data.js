const { Pool } = require('pg');

async function checkRawData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev",
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('=== CHECKING RAW DATA WITHOUT JSON PARSING ===\n');
    
    // Get raw data without any JSON operations
    const rawDataCheck = await pool.query(`
      SELECT 
        email,
        name,
        important_people
      FROM users 
      WHERE important_people IS NOT NULL 
        AND important_people::text != ''
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    console.log('=== RAW FAMILY DATA ===');
    for (let i = 0; i < rawDataCheck.rows.length; i++) {
      const user = rawDataCheck.rows[i];
      console.log(`\n--- User ${i + 1}: ${user.email} ---`);
      console.log(`Name: ${user.name}`);
      
      // Get the raw important_people data
      const rawData = user.important_people;
      
      console.log(`Data Type: ${typeof rawData}`);
      console.log(`Data Value: ${JSON.stringify(rawData)}`);
      
      if (typeof rawData === 'string') {
        console.log(`String Length: ${rawData.length}`);
        console.log(`First 100 chars: "${rawData.substring(0, 100)}"`);
        console.log(`Last 100 chars: "${rawData.substring(Math.max(0, rawData.length - 100))}"`);
        
        // Try to parse it
        try {
          const parsed = JSON.parse(rawData);
          console.log(`✅ JSON Valid - Parsed as:`, parsed);
        } catch (e) {
          console.log(`❌ JSON Invalid: ${e.message}`);
        }
      } else if (rawData && typeof rawData === 'object') {
        console.log(`✅ Already parsed object:`, rawData);
      }
    }

    // Check total count
    const totalCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(important_people) as users_with_family_data,
        COUNT(CASE WHEN important_people::text = '' THEN 1 END) as users_with_empty_string,
        COUNT(CASE WHEN important_people::text = '[]' THEN 1 END) as users_with_empty_array
      FROM users;
    `);
    
    console.log(`\n=== DATA SUMMARY ===`);
    const summary = totalCheck.rows[0];
    console.log(`Total Users: ${summary.total_users}`);
    console.log(`Users with Family Data: ${summary.users_with_family_data}`);
    console.log(`Users with Empty String: ${summary.users_with_empty_string}`);
    console.log(`Users with Empty Array: ${summary.users_with_empty_array}`);
    
  } catch (error) {
    console.error('❌ Raw data check failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    
    // Try to get basic user info without important_people
    try {
      console.log('\n=== ATTEMPTING BASIC USER DATA ===');
      const basicCheck = await pool.query(`
        SELECT email, name, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 3;
      `);
      
      console.log('Basic user data:');
      basicCheck.rows.forEach(user => {
        console.log(`- ${user.email} (${user.name}) created: ${user.created_at}`);
      });
    } catch (e) {
      console.error('❌ Even basic query failed:', e.message);
    }
  } finally {
    await pool.end();
  }
}

checkRawData().catch(console.error);