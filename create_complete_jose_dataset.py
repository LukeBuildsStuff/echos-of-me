#!/usr/bin/env python3
"""
Complete Jose Training Dataset Creator
Creates a comprehensive training dataset from all 150 Jose responses.
"""

import json
import psycopg2
from datetime import datetime

def connect_to_database():
    """Connect to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="echosofme_dev",
            user="echosofme",
            password="secure_dev_password",
            port="5432"
        )
        return conn
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def extract_and_format_jose_data():
    """Extract all Jose responses and create comprehensive training dataset."""
    
    print("🔍 Creating Complete Jose Training Dataset")
    print("=" * 50)
    
    # Connect to database
    conn = connect_to_database()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Get all responses for user_id 2 (lukemoeller@yahoo.com)
        query = """
        SELECT r.id, r.response_text, q.question_text, r.created_at
        FROM responses r 
        JOIN questions q ON r.question_id = q.id 
        WHERE r.user_id = 2 
        ORDER BY r.created_at DESC
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        print(f"✅ Found {len(results)} responses from database")
        
        # Process each response into training format
        training_dataset = []
        conversation_pairs = []
        
        for response_id, response_text, question_text, created_at in results:
            if response_text and response_text.strip():
                # Format for instruction-based training
                training_entry = {
                    "instruction": "You are Jose, a seasoned construction worker from Brooklyn, NY. Respond authentically using your characteristic Brooklyn speech patterns, construction industry knowledge, and references to your family (wife Maria, daughter Sofia, son Miguel). Use natural contractions like 'ain't', 'doin'', 'gotta', and phrases like 'ya know'. Draw from your 20+ years of construction experience.",
                    "input": question_text,
                    "output": response_text,
                    "metadata": {
                        "response_id": response_id,
                        "created_at": str(created_at),
                        "character": "Jose - Brooklyn Construction Worker"
                    }
                }
                training_dataset.append(training_entry)
                
                # Also create simple conversation pair format
                conversation_pairs.append({
                    "question": question_text,
                    "answer": response_text
                })
        
        print(f"✅ Created {len(training_dataset)} training entries")
        
        # Save comprehensive training dataset
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Format 1: Instruction-based training (for fine-tuning)
        instruction_dataset = {
            "dataset_info": {
                "character": "Jose - Brooklyn Construction Worker",
                "description": "Authentic Brooklyn construction worker with 20+ years experience, married to Maria, father to Sofia and Miguel",
                "speech_patterns": [
                    "Brooklyn dialect and contractions (ain't, doin', gotta)",
                    "Construction industry terminology",
                    "Family references (Maria, Sofia, Miguel)",
                    "Working-class values and work ethic",
                    "Phrases like 'ya know', 'buddy', 'pal'"
                ],
                "total_entries": len(training_dataset),
                "created_at": timestamp,
                "user_id": 2,
                "source": "echosofme_dev database"
            },
            "training_data": training_dataset
        }
        
        # Save instruction-based dataset
        with open(f'/home/luke/personal-ai-clone/web/jose_complete_training_dataset_{timestamp}.json', 'w') as f:
            json.dump(instruction_dataset, f, indent=2)
        
        # Format 2: Simple conversation pairs (for chat training)
        conversation_dataset = {
            "character_info": {
                "name": "Jose",
                "occupation": "Construction Worker",
                "location": "Brooklyn, NY",
                "family": ["Maria (wife)", "Sofia (daughter)", "Miguel (son)"],
                "experience": "20+ years in construction",
                "personality": "Hardworking, family-oriented, authentic Brooklyn speech"
            },
            "conversations": conversation_pairs,
            "total_conversations": len(conversation_pairs),
            "created_at": timestamp
        }
        
        with open(f'/home/luke/personal-ai-clone/web/jose_conversation_dataset_{timestamp}.json', 'w') as f:
            json.dump(conversation_dataset, f, indent=2)
        
        # Format 3: JSONL format for model training
        jsonl_filename = f'/home/luke/personal-ai-clone/web/jose_training_data_{timestamp}.jsonl'
        with open(jsonl_filename, 'w') as f:
            for entry in training_dataset:
                # Convert to simple format for JSONL
                jsonl_entry = {
                    "messages": [
                        {"role": "system", "content": entry["instruction"]},
                        {"role": "user", "content": entry["input"]},
                        {"role": "assistant", "content": entry["output"]}
                    ]
                }
                f.write(json.dumps(jsonl_entry) + '\n')
        
        # Create a final consolidated dataset (the main one to use)
        final_dataset = []
        for entry in training_dataset:
            final_entry = {
                "instruction": entry["instruction"],
                "input": entry["input"], 
                "output": entry["output"]
            }
            final_dataset.append(final_entry)
        
        with open('/home/luke/personal-ai-clone/web/jose_final_training_dataset.json', 'w') as f:
            json.dump(final_dataset, f, indent=2)
        
        # Generate summary report
        summary = {
            "extraction_completed": timestamp,
            "database_source": "postgresql://echosofme:***@localhost:5432/echosofme_dev",
            "user_id": 2,
            "user_email": "lukemoeller@yahoo.com",
            "character": "Jose - Brooklyn Construction Worker",
            "total_responses_extracted": len(results),
            "valid_training_entries": len(training_dataset),
            "files_created": [
                f"jose_complete_training_dataset_{timestamp}.json",
                f"jose_conversation_dataset_{timestamp}.json", 
                f"jose_training_data_{timestamp}.jsonl",
                "jose_final_training_dataset.json"
            ],
            "dataset_ready_for_training": True,
            "recommended_file": "jose_final_training_dataset.json"
        }
        
        with open('/home/luke/personal-ai-clone/web/jose_extraction_summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        print("\n🎯 EXTRACTION COMPLETE!")
        print("-" * 30)
        print(f"✅ Extracted: {len(results)} responses")
        print(f"✅ Created: {len(training_dataset)} training entries")
        print(f"✅ Files generated:")
        for filename in summary["files_created"]:
            print(f"   📄 {filename}")
        
        print(f"\n🚀 RECOMMENDED FOR TRAINING:")
        print(f"   📄 jose_final_training_dataset.json ({len(final_dataset)} entries)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during extraction: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    extract_and_format_jose_data()