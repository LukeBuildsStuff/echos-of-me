#!/usr/bin/env python3
"""
Database Schema Inspector
Inspects the database structure to understand how Jose's data is stored
"""

import psycopg2
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def inspect_database():
    """Inspect database schema and sample data"""
    connection_string = "postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev"
    
    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        # Get all tables
        logger.info("📋 Database Tables:")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        for table in tables:
            print(f"  - {table[0]}")
        
        # Inspect key tables
        for table_name in ['users', 'conversations', 'messages', 'character_interactions']:
            try:
                logger.info(f"\n🔍 Table: {table_name}")
                
                # Get column info
                cursor.execute(f"""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}'
                    ORDER BY ordinal_position;
                """)
                columns = cursor.fetchall()
                
                if columns:
                    print("  Columns:")
                    for col in columns:
                        print(f"    - {col[0]} ({col[1]}) {'NULL' if col[2] == 'YES' else 'NOT NULL'}")
                    
                    # Get sample data
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 3;")
                    samples = cursor.fetchall()
                    
                    if samples:
                        print("  Sample data:")
                        for i, sample in enumerate(samples[:2], 1):
                            print(f"    Row {i}: {sample}")
                else:
                    print("  Table not found or no columns")
                    
            except Exception as e:
                print(f"  Error inspecting {table_name}: {e}")
        
        # Look for Jose-specific data
        logger.info("\n🎭 Looking for Jose-related data...")
        
        # Search for Jose in various potential columns
        search_queries = [
            "SELECT COUNT(*) FROM conversations WHERE character_name ILIKE '%jose%'",
            "SELECT COUNT(*) FROM messages WHERE content ILIKE '%jose%'",
            "SELECT DISTINCT character_name FROM conversations WHERE character_name IS NOT NULL LIMIT 10"
        ]
        
        for query in search_queries:
            try:
                cursor.execute(query)
                result = cursor.fetchall()
                print(f"Query: {query}")
                print(f"Result: {result}")
            except Exception as e:
                print(f"Query failed: {e}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"Database inspection failed: {e}")

if __name__ == "__main__":
    inspect_database()