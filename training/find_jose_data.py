#!/usr/bin/env python3
"""
Find Jose Character Data
Searches through the actual database schema to find Jose's character interactions
"""

import psycopg2
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def find_jose_data():
    """Find Jose character data in the database"""
    connection_string = "postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev"
    
    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        # Check ai_conversations table
        logger.info("🔍 Checking ai_conversations table...")
        cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_conversations' ORDER BY ordinal_position;")
        columns = cursor.fetchall()
        
        print("ai_conversations columns:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]})")
        
        # Get sample data
        cursor.execute("SELECT * FROM ai_conversations WHERE user_id = 2 LIMIT 3;")
        samples = cursor.fetchall()
        
        print("\nSample ai_conversations data:")
        for i, sample in enumerate(samples, 1):
            print(f"  Row {i}: {sample}")
        
        # Check responses table
        logger.info("\n🔍 Checking responses table...")
        cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'responses' ORDER BY ordinal_position;")
        columns = cursor.fetchall()
        
        print("responses columns:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]})")
        
        # Get sample responses data
        cursor.execute("SELECT * FROM responses LIMIT 3;")
        samples = cursor.fetchall()
        
        print("\nSample responses data:")
        for i, sample in enumerate(samples, 1):
            print(f"  Row {i}: {sample}")
        
        # Look for Jose-specific patterns
        logger.info("\n🎭 Searching for Jose patterns...")
        
        # Search in responses for Jose content
        cursor.execute("SELECT COUNT(*) FROM responses WHERE content ILIKE '%jose%' OR content ILIKE '%construction%' OR content ILIKE '%brooklyn%';")
        jose_count = cursor.fetchone()[0]
        print(f"Potential Jose responses: {jose_count}")
        
        if jose_count > 0:
            cursor.execute("SELECT id, content FROM responses WHERE content ILIKE '%jose%' OR content ILIKE '%construction%' OR content ILIKE '%brooklyn%' LIMIT 5;")
            jose_samples = cursor.fetchall()
            
            print("\nJose-related response samples:")
            for sample in jose_samples:
                print(f"  ID {sample[0]}: {sample[1][:200]}...")
        
        # Check ai_conversations for character patterns
        cursor.execute("SELECT COUNT(*) FROM ai_conversations WHERE messages::text ILIKE '%jose%' OR messages::text ILIKE '%construction%';")
        conv_count = cursor.fetchone()[0]
        print(f"\nAI conversations mentioning Jose/construction: {conv_count}")
        
        if conv_count > 0:
            cursor.execute("SELECT id, user_id, messages FROM ai_conversations WHERE messages::text ILIKE '%jose%' OR messages::text ILIKE '%construction%' LIMIT 3;")
            conv_samples = cursor.fetchall()
            
            print("\nJose conversation samples:")
            for sample in conv_samples:
                messages = sample[2] if isinstance(sample[2], (list, dict)) else str(sample[2])
                print(f"  Conversation {sample[0]} (User {sample[1]}): {str(messages)[:300]}...")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        logger.error(f"Database search failed: {e}")

if __name__ == "__main__":
    find_jose_data()