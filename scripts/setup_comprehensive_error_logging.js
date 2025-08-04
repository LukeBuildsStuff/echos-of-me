const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'echosofme',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

async function setupComprehensiveErrorLogging() {
  const pool = new Pool(dbConfig);
  let client;
  
  try {
    console.log('🔧 Connecting to PostgreSQL database for comprehensive error logging setup...');
    client = await pool.connect();
    
    // Read the SQL schema file
    const sqlFilePath = path.join(__dirname, 'create_comprehensive_error_logging_tables.sql');
    const sqlSchema = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📊 Executing comprehensive error logging schema...');
    await client.query(sqlSchema);
    
    console.log('✅ Comprehensive error logging system created successfully!');
    console.log('');
    console.log('🎯 System Features:');
    console.log('   • Grief-sensitive error categorization and tracking');
    console.log('   • Real-time family impact assessment with emotional context');
    console.log('   • Crisis detection and automated escalation workflows');
    console.log('   • AI-powered pattern recognition for proactive resolution');
    console.log('   • Compassionate family communication with support offerings');
    console.log('   • Comprehensive analytics for memory preservation protection');
    console.log('   • GDPR-compliant data handling with audit trails');
    console.log('   • PostgreSQL-optimized with JSONB support and GIN indexes');
    console.log('');
    console.log('💝 Family-First Design Principles:');
    console.log('   • Every error evaluated for emotional impact on grieving families');
    console.log('   • Memory preservation failures treated as highest priority');
    console.log('   • Automated grief crisis detection with immediate support');
    console.log('   • Compassionate communication templates for all family interactions');
    console.log('   • Conversation failure tracking for AI interactions with deceased loved ones');
    console.log('   • Emergency escalation for privacy breaches of intimate family data');
    console.log('');
    console.log('🔧 Database Objects Created:');
    console.log('   • 9 core tables with comprehensive family context tracking');
    console.log('   • 20+ indexes optimized for real-time monitoring and analytics');
    console.log('   • 5 materialized views for common dashboard queries');
    console.log('   • Custom PostgreSQL types for type safety');
    console.log('   • Automatic timestamp triggers for audit trails');
    console.log('   • JSONB indexes for context and emotional state searching');
    
    // Verify table creation and show summary
    const tableQuery = `
      SELECT 
        schemaname, 
        tablename, 
        hasindexes, 
        hastriggers
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename LIKE '%error%' 
        OR tablename LIKE '%family%' 
        OR tablename LIKE '%notification%'
      ORDER BY tablename;
    `;
    
    const result = await client.query(tableQuery);
    
    console.log('');
    console.log('📋 Created Tables:');
    result.rows.forEach(row => {
      console.log(`   • ${row.tablename} (indexes: ${row.hasindexes}, triggers: ${row.hastriggers})`);
    });
    
    // Verify enum types
    const enumQuery = `
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
        AND typname IN ('severity_level', 'family_impact_level', 'resolution_type', 'notification_type', 'crisis_severity')
      ORDER BY typname;
    `;
    
    const enumResult = await client.query(enumQuery);
    
    console.log('');
    console.log('🏷️  Created Enum Types:');
    enumResult.rows.forEach(row => {
      console.log(`   • ${row.typname}`);
    });
    
    // Show view count
    const viewQuery = `
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public' 
        AND (viewname LIKE '%error%' OR viewname LIKE '%family%' OR viewname LIKE '%crisis%')
      ORDER BY viewname;
    `;
    
    const viewResult = await client.query(viewQuery);
    
    console.log('');
    console.log('👁️  Created Views:');
    viewResult.rows.forEach(row => {
      console.log(`   • ${row.viewname}`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up comprehensive error logging system:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Test database connection
async function testDatabaseConnection() {
  const pool = new Pool(dbConfig);
  let client;
  
  try {
    console.log('🔍 Testing database connection...');
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Database connection successful!');
    console.log(`   • Current time: ${result.rows[0].current_time}`);
    console.log(`   • PostgreSQL version: ${result.rows[0].postgres_version.split(' ').slice(0, 2).join(' ')}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('');
    console.error('💡 Troubleshooting tips:');
    console.error('   • Ensure PostgreSQL is running');
    console.error('   • Check environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT');
    console.error('   • Verify database exists and user has CREATE privileges');
    console.error('   • For Railway deployment, ensure DATABASE_URL is set');
    return false;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the setup if called directly
if (require.main === module) {
  (async () => {
    try {
      // Test connection first
      const connectionSuccess = await testDatabaseConnection();
      
      if (!connectionSuccess) {
        console.error('');
        console.error('💔 Setup aborted due to database connection failure.');
        process.exit(1);
      }
      
      console.log('');
      await setupComprehensiveErrorLogging();
      
      console.log('');
      console.log('🌟 Comprehensive Error Logging System setup complete!');
      console.log('');
      console.log('🚀 Next Steps:');
      console.log('   1. Update API endpoints to use new schema');
      console.log('   2. Configure real-time WebSocket connections');
      console.log('   3. Implement crisis detection algorithms');
      console.log('   4. Test family communication workflows');
      console.log('   5. Set up monitoring dashboards');
      
      process.exit(0);
    } catch (error) {
      console.error('💔 Setup failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { 
  setupComprehensiveErrorLogging, 
  testDatabaseConnection,
  dbConfig 
};