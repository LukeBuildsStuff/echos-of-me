#!/usr/bin/env python3
"""
Jose Simple Training - CPU/Fallback Version
Trains Jose character model without RTX 5090 specific optimizations
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
    
    # Format data for training
    training_texts = []
    for item in jose_data:
        # Create simple chat format
        text = f"<|user|>\n{item['input']}\n<|assistant|>\n{item['output']}<|endoftext|>"
        training_texts.append(text)
    
    # Tokenize
    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            padding=False,
            max_length=512,  # Smaller for CPU training
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
    """Setup model and tokenizer"""
    logger.info("🚀 Setting up model for Jose training...")
    
    model_name = "microsoft/DialoGPT-small"  # Smaller model for CPU training
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name, padding_side="right")
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    # Load model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")
    
    try:
        if device == "cuda":
            # Try GPU without quantization
            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16,
                device_map="auto"
            )
        else:
            # CPU fallback
            model = AutoModelForCausalLM.from_pretrained(model_name)
    except Exception as e:
        logger.warning(f"GPU setup failed: {e}, falling back to CPU")
        model = AutoModelForCausalLM.from_pretrained(model_name)
        device = "cpu"
    
    # Simple LoRA config for character training
    lora_config = LoraConfig(
        r=8,  # Lower rank for stability
        lora_alpha=16,
        target_modules=["c_attn"],  # DialoGPT specific
        lora_dropout=0.1,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )
    
    # Apply LoRA
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    return model, tokenizer, device

def train_jose_model():
    """Train Jose character model"""
    logger.info("🎭 Starting Jose Character Training...")
    
    # Load data
    jose_data = load_jose_training_data()
    
    # Setup model
    model, tokenizer, device = setup_model_and_tokenizer()
    
    # Create dataset
    dataset = create_training_dataset(jose_data, tokenizer)
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir="/home/luke/personal-ai-clone/web/training/jose_simple_checkpoints",
        overwrite_output_dir=True,
        num_train_epochs=3,
        per_device_train_batch_size=2,  # Small batch for stability
        gradient_accumulation_steps=4,
        warmup_steps=50,
        learning_rate=5e-5,
        weight_decay=0.01,
        logging_steps=10,
        save_steps=100,
        save_total_limit=2,
        prediction_loss_only=True,
        remove_unused_columns=False,
        dataloader_pin_memory=False,
        fp16=device == "cuda",  # Only use fp16 on GPU
        report_to=None,  # Disable reporting
        seed=42,
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
    logger.info("🔥 Starting training...")
    trainer.train()
    
    # Save final model
    final_model_path = "/home/luke/personal-ai-clone/web/training/jose_simple_final"
    os.makedirs(final_model_path, exist_ok=True)
    trainer.save_model(final_model_path)
    
    # Test the model
    logger.info("🧪 Testing Jose character...")
    model.eval()
    
    test_inputs = [
        "Hi Jose, how are you?",
        "What do you do for work?",
        "Tell me about Brooklyn"
    ]
    
    with torch.no_grad():
        for test_input in test_inputs:
            # Format input
            prompt = f"<|user|>\n{test_input}\n<|assistant|>\n"
            inputs = tokenizer(prompt, return_tensors="pt")
            
            if device == "cuda":
                inputs = {k: v.to(model.device) for k, v in inputs.items()}
            
            # Generate response
            outputs = model.generate(
                **inputs,
                max_new_tokens=100,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
            
            # Decode response
            response = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
            logger.info(f"Q: {test_input}")
            logger.info(f"Jose: {response.strip()}")
            logger.info("---")
    
    logger.info("🎉 Jose training completed!")
    logger.info(f"📁 Model saved to: {final_model_path}")
    
    return final_model_path

if __name__ == "__main__":
    train_jose_model()