#!/usr/bin/env python3
import json

# Load training data and show samples
with open('/home/luke/personal-ai-clone/web/training/jose_training_data.jsonl', 'r') as f:
    examples = [json.loads(line) for line in f]

print(f"Loaded {len(examples)} Jose training examples")
print("\nSample conversations:")

for i, example in enumerate(examples[:3], 1):
    messages = example['messages']
    user_msg = messages[1]['content']
    jose_response = messages[2]['content']
    print(f"\nExample {i}:")
    print(f"User: {user_msg}")
    print(f"Jose: {jose_response[:150]}...")

print("\n🎉 Jose training data is ready!")
print("📝 Training file: /home/luke/personal-ai-clone/web/training/jose_training_data.jsonl")
print("📊 Total examples:", len(examples))
