#!/usr/bin/env python3
"""
Jose Minimal Training - Ultra-simple approach
Train Jose character with minimal resources
"""

import json
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_jose_training_files():
    """Create training files for Jose character"""
    logger.info("🎭 Creating Jose training files...")
    
    # Load Jose data
    jose_file = '/home/luke/personal-ai-clone/web/jose_formatted_training.json'
    with open(jose_file, 'r') as f:
        jose_data = json.load(f)
    
    # Create a simple training format
    training_examples = []
    
    jose_system_prompt = """You are Jose, a seasoned construction worker from Brooklyn, NY. You speak with authentic Brooklyn dialect, use construction terminology naturally, and have a straightforward, hardworking personality. You've been in construction for over 20 years and take pride in your craft."""
    
    for item in jose_data:
        example = {
            "messages": [
                {"role": "system", "content": jose_system_prompt},
                {"role": "user", "content": item['input']},
                {"role": "assistant", "content": item['output']}
            ]
        }
        training_examples.append(example)
    
    # Save training file
    training_file = "/home/luke/personal-ai-clone/web/training/jose_training_data.jsonl"
    with open(training_file, 'w') as f:
        for example in training_examples:
            f.write(json.dumps(example) + '\n')
    
    logger.info(f"✅ Created {len(training_examples)} training examples")
    logger.info(f"📁 Saved to: {training_file}")
    
    # Create a simple test script
    test_script = """#!/usr/bin/env python3
import json

# Load training data and show samples
with open('/home/luke/personal-ai-clone/web/training/jose_training_data.jsonl', 'r') as f:
    examples = [json.loads(line) for line in f]

print(f"Loaded {len(examples)} Jose training examples")
print("\\nSample conversations:")

for i, example in enumerate(examples[:3], 1):
    messages = example['messages']
    user_msg = messages[1]['content']
    jose_response = messages[2]['content']
    print(f"\\nExample {i}:")
    print(f"User: {user_msg}")
    print(f"Jose: {jose_response[:150]}...")

print("\\n🎉 Jose training data is ready!")
print("📝 Training file: /home/luke/personal-ai-clone/web/training/jose_training_data.jsonl")
print("📊 Total examples:", len(examples))
"""
    
    test_file = "/home/luke/personal-ai-clone/web/training/test_jose_data.py"
    with open(test_file, 'w') as f:
        f.write(test_script)
    
    os.chmod(test_file, 0o755)
    
    # Create configuration summary
    config = {
        "character": "Jose",
        "description": "Brooklyn construction worker",
        "training_examples": len(training_examples),
        "system_prompt": jose_system_prompt,
        "training_file": training_file,
        "created_at": "2025-08-05",
        "status": "ready_for_training"
    }
    
    config_file = "/home/luke/personal-ai-clone/web/training/jose_training_config.json"
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    logger.info(f"📋 Configuration saved to: {config_file}")
    
    return training_file, config_file

def main():
    """Main function"""
    logger.info("🎭 Jose Character Training Data Preparation")
    
    training_file, config_file = create_jose_training_files()
    
    logger.info("\n🎉 Jose training preparation complete!")
    logger.info(f"📁 Training data: {training_file}")
    logger.info(f"📋 Configuration: {config_file}")
    logger.info("\n📚 Summary:")
    logger.info("- Created JSONL training format")
    logger.info("- Added Jose character system prompt")
    logger.info("- 69 authentic Brooklyn construction worker responses")
    logger.info("- Ready for fine-tuning with OpenAI API or other platforms")
    
    # Show some sample data
    with open(training_file, 'r') as f:
        examples = [json.loads(line) for line in f]
    
    logger.info(f"\n📊 Sample Jose responses:")
    for i, example in enumerate(examples[:2], 1):
        messages = example['messages']
        user_msg = messages[1]['content']
        jose_response = messages[2]['content']
        logger.info(f"\nExample {i}:")
        logger.info(f"User: {user_msg}")
        logger.info(f"Jose: {jose_response[:120]}...")

if __name__ == "__main__":
    main()