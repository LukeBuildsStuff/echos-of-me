#!/usr/bin/env python3
"""
Jose Lightweight Training
Simple character training using GPT-2 as base model
"""

import json
import logging
import torch
import os
from transformers import GPT2LMHeadModel, GPT2Tokenizer, TextDataset, DataCollatorForLanguageModeling
from transformers import Trainer, TrainingArguments

# Force CPU to avoid RTX 5090 compatibility issues
os.environ["CUDA_VISIBLE_DEVICES"] = ""

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def prepare_jose_training_text():
    """Prepare training text file"""
    logger.info("📚 Preparing Jose training text...")
    
    # Load Jose data
    jose_file = '/home/luke/personal-ai-clone/web/jose_formatted_training.json'
    with open(jose_file, 'r') as f:
        jose_data = json.load(f)
    
    # Create training text with special tokens
    training_text = ""
    for item in jose_data:
        # Simple format for GPT-2
        conversation = f"Human: {item['input']}\nJose: {item['output']}\n\n"
        training_text += conversation
    
    # Save to text file
    text_file = "/home/luke/personal-ai-clone/web/training/jose_training.txt"
    with open(text_file, 'w', encoding='utf-8') as f:
        f.write(training_text)
    
    logger.info(f"✅ Training text saved to: {text_file}")
    logger.info(f"📊 Text length: {len(training_text)} characters")
    
    return text_file

def train_jose_gpt2():
    """Train Jose using GPT-2"""
    logger.info("🎭 Starting Jose GPT-2 training...")
    
    # Prepare training data
    text_file = prepare_jose_training_text()
    
    # Load GPT-2 model and tokenizer
    logger.info("🚀 Loading GPT-2 model...")
    model_name = "gpt2"
    
    tokenizer = GPT2Tokenizer.from_pretrained(model_name)
    model = GPT2LMHeadModel.from_pretrained(model_name)
    
    # Add pad token
    tokenizer.pad_token = tokenizer.eos_token
    
    # Create dataset
    logger.info("🔧 Creating dataset...")
    
    # Read and tokenize the text
    with open(text_file, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Split into chunks
    max_length = 256  # Shorter for faster training
    inputs = tokenizer(text, return_tensors="pt", max_length=max_length, truncation=True, padding=True)
    
    # Create a simple dataset
    class SimpleDataset:
        def __init__(self, tokenizer, text, max_length):
            self.tokenizer = tokenizer
            self.examples = []
            
            # Split text into chunks
            tokens = tokenizer.encode(text)
            for i in range(0, len(tokens) - max_length, max_length):
                chunk = tokens[i:i + max_length]
                self.examples.append(torch.tensor(chunk))
        
        def __len__(self):
            return len(self.examples)
        
        def __getitem__(self, idx):
            return {"input_ids": self.examples[idx], "labels": self.examples[idx]}
    
    dataset = SimpleDataset(tokenizer, text, max_length)
    logger.info(f"📊 Created dataset with {len(dataset)} examples")
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir="/home/luke/personal-ai-clone/web/training/jose_gpt2_output",
        overwrite_output_dir=True,
        num_train_epochs=3,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        warmup_steps=10,
        learning_rate=5e-5,
        logging_steps=5,
        save_steps=50,
        save_total_limit=2,
        prediction_loss_only=True,
        fp16=False,  # CPU training
        dataloader_num_workers=0,
        report_to=None,
        seed=42
    )
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )
    
    # Create trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        data_collator=data_collator,
        tokenizer=tokenizer,
    )
    
    # Train
    logger.info("🔥 Starting training...")
    trainer.train()
    
    # Save model
    model_path = "/home/luke/personal-ai-clone/web/training/jose_gpt2_final"
    os.makedirs(model_path, exist_ok=True)
    trainer.save_model(model_path)
    tokenizer.save_pretrained(model_path)
    
    logger.info(f"💾 Model saved to: {model_path}")
    
    # Test the model
    logger.info("🧪 Testing Jose...")
    model.eval()
    
    test_prompts = [
        "Human: Hi Jose, how are you?\nJose:",
        "Human: What do you do for work?\nJose:",
        "Human: Tell me about Brooklyn\nJose:"
    ]
    
    with torch.no_grad():
        for prompt in test_prompts:
            inputs = tokenizer.encode(prompt, return_tensors="pt")
            outputs = model.generate(
                inputs,
                max_length=inputs.shape[1] + 50,
                temperature=0.8,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
            
            response = tokenizer.decode(outputs[0], skip_special_tokens=True)
            # Extract just Jose's response
            jose_response = response[len(prompt):].strip()
            
            logger.info(f"Prompt: {prompt}")
            logger.info(f"Response: {jose_response}")
            logger.info("---")
    
    logger.info("🎉 Jose GPT-2 training completed!")
    return model_path

if __name__ == "__main__":
    try:
        model_path = train_jose_gpt2()
        logger.info(f"✅ Training successful! Model at: {model_path}")
    except Exception as e:
        logger.error(f"❌ Training failed: {e}")
        # Fall back to just creating the training data
        logger.info("📚 Creating training data files as fallback...")
        text_file = prepare_jose_training_text()
        logger.info(f"✅ Training data ready at: {text_file}")