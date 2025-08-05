#!/usr/bin/env python3
"""
Jose CPU Training - Force CPU Training
Trains Jose character model on CPU to avoid RTX 5090 compatibility issues
"""

import os
import json
import logging
import torch
from datetime import datetime
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    TrainingArguments, 
    Trainer,
    DataCollatorForLanguageModeling,
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import Dataset

# Force CPU usage
os.environ["CUDA_VISIBLE_DEVICES"] = ""

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_jose_training_data():
    """Load Jose training data"""
    logger.info("📚 Loading Jose character training data...")
    
    jose_file = '/home/luke/personal-ai-clone/web/jose_formatted_training.json'
    
    with open(jose_file, 'r') as f:
        jose_data = json.load(f)
    
    logger.info(f"📊 Loaded {len(jose_data)} Jose character examples")
    return jose_data

def create_training_dataset(jose_data, tokenizer):
    """Create training dataset"""
    logger.info("🔧 Preparing Jose character dataset...")
    
    # Format data for training with Jose character
    training_texts = []
    for item in jose_data:
        # Create TinyLlama-style format with Jose system prompt
        text = f"""<|system|>
You are Jose, a seasoned construction worker from Brooklyn, NY. You speak with authentic Brooklyn dialect, use construction terminology naturally, and have a straightforward, hardworking personality. You've been in construction for over 20 years and take pride in your craft.</s>
<|user|>
{item['input']}</s>
<|assistant|>
{item['output']}</s>"""
        training_texts.append(text)
    
    # Tokenize
    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            padding=False,
            max_length=512,
            return_tensors=None
        )
    
    dataset = Dataset.from_dict({"text": training_texts})
    dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=dataset.column_names,
        desc="Tokenizing Jose responses"
    )
    
    logger.info(f"✅ Dataset prepared: {len(dataset)} examples")
    return dataset

def setup_model_and_tokenizer():
    """Setup model and tokenizer for CPU training"""
    logger.info("🚀 Setting up model for Jose CPU training...")
    
    # Use a small, efficient model for CPU training
    model_name = "microsoft/DialoGPT-small"
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name, padding_side="right")
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    # Load model on CPU
    logger.info("Loading model on CPU...")
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float32,  # Use float32 for CPU
        device_map=None  # Don't use device_map for CPU
    )
    
    # Move to CPU explicitly
    model = model.to('cpu')
    
    # Simple LoRA config for character training
    lora_config = LoraConfig(
        r=4,  # Very low rank for CPU training
        lora_alpha=8,
        target_modules=["c_attn"],  # DialoGPT specific
        lora_dropout=0.1,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )
    
    # Apply LoRA
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    logger.info("✅ Model setup complete on CPU")
    return model, tokenizer

def train_jose_model():
    """Train Jose character model on CPU"""
    logger.info("🎭 Starting Jose Character Training on CPU...")
    
    # Load data
    jose_data = load_jose_training_data()
    
    # Setup model
    model, tokenizer = setup_model_and_tokenizer()
    
    # Create dataset
    dataset = create_training_dataset(jose_data, tokenizer)
    
    # Training arguments optimized for CPU
    training_args = TrainingArguments(
        output_dir="/home/luke/personal-ai-clone/web/training/jose_cpu_checkpoints",
        overwrite_output_dir=True,
        num_train_epochs=2,  # Fewer epochs for CPU
        per_device_train_batch_size=1,  # Very small batch for CPU
        gradient_accumulation_steps=8,  # Larger accumulation
        warmup_steps=20,
        learning_rate=3e-4,  # Higher learning rate
        weight_decay=0.01,
        logging_steps=5,
        save_steps=50,
        save_total_limit=2,
        prediction_loss_only=True,
        remove_unused_columns=False,
        dataloader_pin_memory=False,
        fp16=False,  # No fp16 on CPU
        report_to=None,
        seed=42,
        dataloader_num_workers=0,  # No multiprocessing
    )
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
        return_tensors="pt",
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
    logger.info("🔥 Starting CPU training...")
    start_time = datetime.now()
    trainer.train()
    end_time = datetime.now()
    
    training_duration = (end_time - start_time).total_seconds()
    logger.info(f"Training completed in {training_duration:.1f} seconds ({training_duration/60:.1f} minutes)")
    
    # Save final model
    final_model_path = "/home/luke/personal-ai-clone/web/training/jose_cpu_final"
    os.makedirs(final_model_path, exist_ok=True)
    trainer.save_model(final_model_path)
    
    # Test the model
    logger.info("🧪 Testing Jose character...")
    model.eval()
    
    test_inputs = [
        "Hi Jose, how are you?",
        "What do you do for work?",
        "Tell me about Brooklyn",
        "What's your favorite part of construction?"
    ]
    
    with torch.no_grad():
        for test_input in test_inputs:
            prompt = f"""<|system|>
You are Jose, a seasoned construction worker from Brooklyn, NY. You speak with authentic Brooklyn dialect, use construction terminology naturally, and have a straightforward, hardworking personality. You've been in construction for over 20 years and take pride in your craft.</s>
<|user|>
{test_input}</s>
<|assistant|>
"""
            inputs = tokenizer(prompt, return_tensors="pt")
            
            # Generate response
            outputs = model.generate(
                **inputs,
                max_new_tokens=80,
                temperature=0.8,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id
            )
            
            # Decode response
            full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
            # Extract just the assistant response
            response = full_response.split("<|assistant|>")[-1].strip()
            
            logger.info(f"Q: {test_input}")
            logger.info(f"Jose: {response}")
            logger.info("---")
    
    logger.info("🎉 Jose CPU training completed!")
    logger.info(f"📁 Model saved to: {final_model_path}")
    
    return final_model_path

if __name__ == "__main__":
    result = train_jose_model()