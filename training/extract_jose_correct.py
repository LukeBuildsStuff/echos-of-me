#!/usr/bin/env python3
"""
Corrected Jose Character Data Extraction
Using the actual database schema to extract Jose's responses
"""

import psycopg2
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_jose_data_correct():
    """Extract Jose data using correct database schema"""
    connection_string = "postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev"
    
    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        # First, let's look for Jose patterns in ai_conversations
        logger.info("🔍 Searching for Jose patterns in ai_conversations...")
        
        # Search for Jose, construction, Brooklyn patterns in AI responses
        cursor.execute("""
            SELECT 
                id, user_id, conversation_id, user_message, ai_response, 
                model_version, emotional_tone, created_at
            FROM ai_conversations 
            WHERE user_id = 2 
            AND (
                ai_response ILIKE '%jose%' OR 
                ai_response ILIKE '%construction%' OR 
                ai_response ILIKE '%brooklyn%' OR
                ai_response ILIKE '%build%' OR
                ai_response ILIKE '%work%' OR
                ai_response ILIKE '%hey%' OR
                ai_response ILIKE '%buddy%' OR
                ai_response ILIKE '%pal%'
            )
            ORDER BY created_at DESC
            LIMIT 50;
        """)
        
        jose_conversations = cursor.fetchall()
        logger.info(f"Found {len(jose_conversations)} potential Jose conversations")
        
        # Also search in responses table
        logger.info("🔍 Searching for Jose patterns in responses...")
        cursor.execute("""
            SELECT 
                r.id, r.user_id, r.question_id, r.response_text, r.created_at,
                q.question_text
            FROM responses r
            JOIN questions q ON r.question_id = q.id
            WHERE r.user_id = 2 
            AND (
                r.response_text ILIKE '%jose%' OR 
                r.response_text ILIKE '%construction%' OR 
                r.response_text ILIKE '%brooklyn%' OR
                r.response_text ILIKE '%build%' OR
                r.response_text ILIKE '%work%'
            )
            ORDER BY r.created_at DESC
            LIMIT 50;
        """)
        
        jose_responses = cursor.fetchall()
        logger.info(f"Found {len(jose_responses)} potential Jose responses")
        
        # Convert to training format
        training_data = []
        
        # Process AI conversations
        for conv in jose_conversations:
            conv_id, user_id, conversation_id, user_msg, ai_response, model_version, tone, created_at = conv
            
            if user_msg and ai_response and len(ai_response.strip()) > 10:
                training_data.append({
                    'input': user_msg.strip(),
                    'output': ai_response.strip(),
                    'source': 'ai_conversations',
                    'conversation_id': conversation_id,
                    'created_at': created_at.isoformat() if created_at else None
                })
        
        # Process structured responses (if they exist)
        for resp in jose_responses:
            resp_id, user_id, question_id, response_text, created_at, question_text = resp
            
            if question_text and response_text and len(response_text.strip()) > 10:
                training_data.append({
                    'input': question_text.strip(),
                    'output': response_text.strip(),
                    'source': 'responses',
                    'response_id': resp_id,
                    'created_at': created_at.isoformat() if created_at else None
                })
        
        logger.info(f"Total training examples: {len(training_data)}")
        
        # If we don't have enough Jose-specific data, let's get all user conversations
        if len(training_data) < 50:
            logger.info("🔍 Not enough Jose-specific data, getting all user conversations...")
            
            cursor.execute("""
                SELECT 
                    id, user_id, conversation_id, user_message, ai_response, 
                    model_version, emotional_tone, created_at
                FROM ai_conversations 
                WHERE user_id = 2 
                AND ai_response IS NOT NULL 
                AND LENGTH(ai_response) > 10
                ORDER BY created_at DESC
                LIMIT 150;
            """)
            
            all_conversations = cursor.fetchall()
            logger.info(f"Found {len(all_conversations)} total user conversations")
            
            # Add these to training data with Jose character prompt
            for conv in all_conversations:
                conv_id, user_id, conversation_id, user_msg, ai_response, model_version, tone, created_at = conv
                
                if user_msg and ai_response and len(ai_response.strip()) > 10:
                    # Only add if not already in training data
                    existing = any(item['input'] == user_msg.strip() and item['output'] == ai_response.strip() 
                                 for item in training_data)
                    
                    if not existing:
                        training_data.append({
                            'input': user_msg.strip(),
                            'output': ai_response.strip(),
                            'source': 'ai_conversations',
                            'conversation_id': conversation_id,
                            'created_at': created_at.isoformat() if created_at else None
                        })
        
        # Save the training data
        output_file = "/home/luke/personal-ai-clone/web/jose_formatted_training.json"
        
        formatted_data = []
        for item in training_data[:150]:  # Limit to 150 examples
            formatted_data.append({
                'input': item['input'],
                'output': item['output']
            })
        
        with open(output_file, 'w') as f:
            json.dump(formatted_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✅ Saved {len(formatted_data)} training examples to {output_file}")
        
        # Show some samples
        logger.info("📚 Sample training data:")
        for i, example in enumerate(formatted_data[:3], 1):
            logger.info(f"\nExample {i}:")
            logger.info(f"Input: {example['input'][:100]}...")
            logger.info(f"Output: {example['output'][:100]}...")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Extraction failed: {e}")
        return False

if __name__ == "__main__":
    logger.info("🎭 Starting Jose data extraction...")
    if extract_jose_data_correct():
        logger.info("🎉 Jose data extraction completed successfully!")
    else:
        logger.error("❌ Jose data extraction failed")