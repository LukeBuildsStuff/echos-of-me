#!/usr/bin/env python3
"""
Jose Character Data Extraction Script
Extracts Jose's authentic construction worker responses from the PostgreSQL database
for fine-tuning the character model.

Database: echosofme_dev
Target: 150 Jose responses from lukemoeller@yahoo.com account
"""

import os
import sys
import json
import logging
import psycopg2
from datetime import datetime
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('jose_data_extraction.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class JoseDataExtractor:
    """Extract Jose character data from PostgreSQL database"""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.conn = None
        
    def connect_database(self):
        """Connect to PostgreSQL database"""
        try:
            logger.info("🔌 Connecting to PostgreSQL database...")
            self.conn = psycopg2.connect(self.connection_string)
            logger.info("✅ Database connection established")
            return True
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
    
    def get_user_id(self, email: str) -> Optional[int]:
        """Get user ID for the specified email"""
        try:
            cursor = self.conn.cursor()
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            result = cursor.fetchone()
            cursor.close()
            
            if result:
                user_id = result[0]
                logger.info(f"👤 Found user ID {user_id} for {email}")
                return user_id
            else:
                logger.error(f"❌ User not found: {email}")
                return None
        except Exception as e:
            logger.error(f"❌ Error getting user ID: {e}")
            return None
    
    def extract_jose_conversations(self, user_id: int, limit: int = 150) -> List[Dict]:
        """Extract Jose character conversations from the database"""
        try:
            logger.info(f"📚 Extracting Jose conversations for user ID {user_id}...")
            
            cursor = self.conn.cursor()
            
            # Query to get conversations where Jose is the character
            # Assuming we have a conversations table with character_name and messages
            query = """
            SELECT 
                c.id as conversation_id,
                c.character_name,
                c.created_at,
                m.content as message_content,
                m.sender_type,
                m.created_at as message_time
            FROM conversations c
            JOIN messages m ON c.id = m.conversation_id
            WHERE c.user_id = %s 
            AND (LOWER(c.character_name) LIKE '%jose%' OR c.character_name = 'Jose')
            ORDER BY c.created_at DESC, m.created_at ASC
            LIMIT %s;
            """
            
            cursor.execute(query, (user_id, limit * 2))  # Get more to filter properly
            results = cursor.fetchall()
            cursor.close()
            
            logger.info(f"📊 Found {len(results)} message records")
            
            # Process results into conversation pairs
            conversations = self._process_conversation_data(results)
            
            logger.info(f"✅ Extracted {len(conversations)} Jose conversation pairs")
            return conversations
            
        except Exception as e:
            logger.error(f"❌ Error extracting conversations: {e}")
            return []
    
    def _process_conversation_data(self, results: List) -> List[Dict]:
        """Process raw database results into training format"""
        conversations = []
        current_conversation = {}
        
        for row in results:
            conversation_id, character_name, conv_created, message_content, sender_type, msg_time = row
            
            # Group messages by conversation
            if conversation_id not in current_conversation:
                current_conversation[conversation_id] = {
                    'character_name': character_name,
                    'messages': []
                }
            
            current_conversation[conversation_id]['messages'].append({
                'content': message_content,
                'sender_type': sender_type,
                'timestamp': msg_time
            })
        
        # Convert to question-answer pairs
        for conv_id, conv_data in current_conversation.items():
            messages = conv_data['messages']
            
            # Look for user-assistant pairs
            for i in range(len(messages) - 1):
                if messages[i]['sender_type'] == 'user' and messages[i+1]['sender_type'] == 'assistant':
                    user_message = messages[i]['content']
                    jose_response = messages[i+1]['content']
                    
                    # Filter for authentic Jose responses (basic validation)
                    if self._is_authentic_jose_response(jose_response):
                        conversations.append({
                            'input': user_message.strip(),
                            'output': jose_response.strip(),
                            'character': conv_data['character_name'],
                            'conversation_id': conv_id
                        })
        
        return conversations
    
    def _is_authentic_jose_response(self, response: str) -> bool:
        """Basic validation for authentic Jose responses"""
        if not response or len(response.strip()) < 10:
            return False
        
        # Look for Brooklyn/construction worker indicators
        brooklyn_indicators = ['brooklyn', 'construction', 'build', 'work', 'job', 'site']
        response_lower = response.lower()
        
        # Check for authentic character traits
        has_character_traits = any(indicator in response_lower for indicator in brooklyn_indicators)
        
        # Basic length and content validation
        is_reasonable_length = 10 <= len(response) <= 2000
        
        return has_character_traits or is_reasonable_length
    
    def save_training_data(self, conversations: List[Dict], output_file: str):
        """Save extracted conversations to JSON file for training"""
        try:
            logger.info(f"💾 Saving {len(conversations)} conversations to {output_file}")
            
            # Add metadata
            training_data = {
                'metadata': {
                    'character': 'Jose',
                    'description': 'Brooklyn construction worker responses',
                    'extracted_at': datetime.now().isoformat(),
                    'total_examples': len(conversations)
                },
                'conversations': conversations
            }
            
            with open(output_file, 'w') as f:
                json.dump(training_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✅ Training data saved to {output_file}")
            
        except Exception as e:
            logger.error(f"❌ Error saving training data: {e}")
    
    def extract_and_format_jose_data(self, user_email: str, output_file: str, limit: int = 150):
        """Complete extraction and formatting pipeline"""
        logger.info("🎭 Starting Jose character data extraction...")
        
        try:
            # Connect to database
            if not self.connect_database():
                return False
            
            # Get user ID
            user_id = self.get_user_id(user_email)
            if not user_id:
                return False
            
            # Extract conversations
            conversations = self.extract_jose_conversations(user_id, limit)
            if not conversations:
                logger.error("❌ No Jose conversations found")
                return False
            
            # Save training data
            self.save_training_data(conversations, output_file)
            
            # Close database connection
            if self.conn:
                self.conn.close()
                logger.info("🔌 Database connection closed")
            
            logger.info("🎉 Jose data extraction completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Extraction failed: {e}")
            return False

def main():
    """Main extraction script"""
    logger.info("🎭 Jose Character Data Extraction Starting...")
    
    # Database connection
    connection_string = "postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev"
    
    # Target user email
    user_email = "lukemoeller@yahoo.com"
    
    # Output file for training
    output_file = "/home/luke/personal-ai-clone/web/jose_formatted_training.json"
    
    # Create extractor
    extractor = JoseDataExtractor(connection_string)
    
    # Extract Jose data
    success = extractor.extract_and_format_jose_data(
        user_email=user_email,
        output_file=output_file,
        limit=150
    )
    
    if success:
        logger.info("🎉 Jose data extraction completed successfully!")
        logger.info(f"📁 Training data saved to: {output_file}")
    else:
        logger.error("❌ Jose data extraction failed")
        sys.exit(1)

if __name__ == "__main__":
    main()