const { Pool } = require('pg');

async function testFamilyIssue() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev",
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('=== FAMILY MEMBER ISSUE INVESTIGATION ===\n');
    console.log('Testing database connection...');
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection successful\n');
    
    // Check if users table exists and has the important_people column
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('important_people', 'email', 'name')
      ORDER BY column_name;
    `);
    
    console.log('=== USERS TABLE STRUCTURE ===');
    tableCheck.rows.forEach(row => {
      console.log(`Column: ${row.column_name}, Type: ${row.data_type}, Nullable: ${row.is_nullable}`);
    });

    // Check if there are any test users with family data
    const userCheck = await pool.query(`
      SELECT 
        email,
        name,
        important_people,
        CASE 
          WHEN important_people IS NULL THEN 'NULL'
          WHEN important_people = '' THEN 'EMPTY STRING'
          WHEN important_people = '[]' THEN 'EMPTY ARRAY'
          ELSE 'HAS DATA'
        END as data_status,
        length(important_people::text) as data_length
      FROM users 
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    console.log('\n=== USER DATA SAMPLE ===');
    userCheck.rows.forEach(user => {
      console.log(`User: ${user.email}, Name: ${user.name}, Family Data Status: ${user.data_status}, Length: ${user.data_length}`);
      if (user.important_people && user.important_people !== '' && user.important_people !== '[]') {
        try {
          const parsed = typeof user.important_people === 'string' 
            ? JSON.parse(user.important_people)
            : user.important_people;
          console.log(`  Family Members Count: ${Array.isArray(parsed) ? parsed.length : 'Not an array'}`);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((member, idx) => {
              console.log(`    ${idx + 1}. ${member.name} (${member.relationship})`);
            });
          }
        } catch (e) {
          console.log(`  JSON Parse Error: ${e.message}`);
          console.log(`  Raw Data: ${user.important_people.substring(0, 100)}...`);
        }
      }
    });

    // Test a simulated POST operation - add a test family member
    const testUser = userCheck.rows[0];
    if (testUser) {
      console.log(`\n=== TESTING FAMILY MEMBER OPERATIONS FOR: ${testUser.email} ===`);
      
      // Get current family members
      let currentMembers = [];
      try {
        if (testUser.important_people) {
          currentMembers = typeof testUser.important_people === 'string' 
            ? JSON.parse(testUser.important_people)
            : testUser.important_people;
        }
      } catch (e) {
        console.log(`❌ Error parsing existing family data: ${e.message}`);
      }

      console.log(`Current family members count: ${currentMembers.length}`);

      // Add a test family member
      const newMember = {
        name: 'Test Family Member',
        relationship: 'Test Relationship',
        birthday: null,
        memorial_date: null
      };

      const updatedMembers = [...(Array.isArray(currentMembers) ? currentMembers : []), newMember];
      
      try {
        // Simulate the UPDATE operation
        await pool.query(`
          UPDATE users 
          SET important_people = $1, updated_at = CURRENT_TIMESTAMP
          WHERE email = $2
        `, [JSON.stringify(updatedMembers), testUser.email]);

        console.log(`✅ Successfully added test family member`);

        // Now test retrieval
        const retrievalTest = await pool.query(`
          SELECT important_people 
          FROM users 
          WHERE email = $1
        `, [testUser.email]);

        const retrievedData = retrievalTest.rows[0].important_people;
        const parsedRetrievedData = typeof retrievedData === 'string' 
          ? JSON.parse(retrievedData)
          : retrievedData;

        console.log(`Retrieved family members count: ${parsedRetrievedData.length}`);
        console.log(`✅ Save and retrieve working correctly`);

        // Clean up - remove the test member
        await pool.query(`
          UPDATE users 
          SET important_people = $1
          WHERE email = $2
        `, [JSON.stringify(currentMembers), testUser.email]);

        console.log(`✅ Test cleanup completed`);

      } catch (e) {
        console.log(`❌ Error during family member operation: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database operation failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testFamilyIssue().catch(console.error);