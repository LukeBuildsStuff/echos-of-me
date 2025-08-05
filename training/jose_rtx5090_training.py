#!/usr/bin/env python3
"""
Jose Character Fine-tuning Pipeline - RTX 5090 Optimized
Author: Claude Code (LLM Fine-tuning Specialist)

Optimized for:
- Jose's Brooklyn construction worker personality
- Llama 3.1 8B as base model for character consistency
- RTX 5090 24GB VRAM with QLoRA 4-bit quantization
- Flash Attention 2 for memory efficiency
- Character-specific training parameters
"""

import os
import sys
import json
import time
import logging
import torch
import torch.nn as nn
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

# Training imports
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    TrainingArguments, 
    Trainer,
    DataCollatorForLanguageModeling,
    BitsAndBytesConfig,
    TrainerCallback
)
from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training
from datasets import Dataset
import bitsandbytes as bnb
from accelerate import Accelerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/luke/personal-ai-clone/web/training/jose_training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class JoseRTX5090Config:
    """Jose character training configuration optimized for RTX 5090"""
    # Base model - TinyLlama 1.1B for character fine-tuning (no auth required)
    model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    max_length: int = 2048
    
    # QLoRA configuration optimized for character fine-tuning
    lora_r: int = 32  # Higher rank for better personality capture
    lora_alpha: int = 64  # Increased for stronger adaptation
    lora_dropout: float = 0.05  # Lower dropout to preserve character traits
    target_modules: List[str] = None
    
    # Training configuration for personality fine-tuning (TinyLlama optimized)
    batch_size: int = 4  # Larger batch size for 1.1B model
    gradient_accumulation_steps: int = 8  # Effective batch size of 32
    learning_rate: float = 2e-4  # Higher learning rate for smaller model
    num_epochs: int = 6  # More epochs for character development
    warmup_steps: int = 100
    
    # RTX 5090 memory management
    max_memory_gb: int = 22  # Leave 2GB buffer for RTX 5090
    gradient_checkpointing: bool = True
    flash_attention: bool = False  # Disable for compatibility
    
    # Jose-specific character parameters
    character_name: str = "Jose"
    character_description: str = "Brooklyn construction worker with authentic NY speech patterns"
    system_prompt: str = "You are Jose, a seasoned construction worker from Brooklyn, NY. You speak with authentic Brooklyn dialect, use construction terminology naturally, and have a straightforward, hardworking personality. You've been in construction for over 20 years and take pride in your craft."
    
    def __post_init__(self):
        if self.target_modules is None:
            # Mistral 7B specific target modules
            self.target_modules = [
                "q_proj", "k_proj", "v_proj", "o_proj",
                "gate_proj", "up_proj", "down_proj"
            ]

class JoseTrainingPipeline:
    """Jose character training pipeline optimized for RTX 5090"""
    
    def __init__(self, config: JoseRTX5090Config):
        self.config = config
        self.accelerator = Accelerator()
        self.tokenizer = None
        self.model = None
        self.dataset = None
        self.trainer = None
        
        # Verify RTX 5090 and model compatibility
        self._verify_rtx5090_compatibility()
        
    def _verify_rtx5090_compatibility(self):
        """Verify RTX 5090 and Llama 3.1 compatibility"""
        logger.info("🔍 Verifying RTX 5090 compatibility for Jose training...")
        
        # Check PyTorch version
        pytorch_version = torch.__version__
        logger.info(f"PyTorch version: {pytorch_version}")
        
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA not available - RTX 5090 required")
            
        # Check CUDA capability
        device_capability = torch.cuda.get_device_capability(0)
        logger.info(f"CUDA device capability: {device_capability}")
        
        # Check GPU memory
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        logger.info(f"GPU memory: {gpu_memory:.1f} GB")
        
        if gpu_memory < 20:
            raise RuntimeError(f"Insufficient GPU memory: {gpu_memory:.1f}GB. RTX 5090 with 24GB required")
        
        # Check device name
        device_name = torch.cuda.get_device_name(0)
        logger.info(f"GPU: {device_name}")
        
        logger.info("✅ RTX 5090 compatibility verified for Jose training")
        
    def load_jose_training_data(self) -> List[Dict]:
        """Load Jose's character responses from JSON file"""
        logger.info("📚 Loading Jose character training data...")
        
        # Load the extracted Jose data
        jose_file = '/home/luke/personal-ai-clone/web/jose_formatted_training.json'
        
        if not os.path.exists(jose_file):
            raise FileNotFoundError(f"Jose training data not found: {jose_file}")
        
        with open(jose_file, 'r') as f:
            jose_data = json.load(f)
        
        logger.info(f"📊 Loaded {len(jose_data)} Jose character examples")
        
        # Convert to training format with Jose's system prompt
        training_data = []
        for item in jose_data:
            # Create TinyLlama chat format for Jose character
            prompt = f"""<|system|>
{self.config.system_prompt}</s>
<|user|>
{item['input']}</s>
<|assistant|>
{item['output']}</s>"""
            
            training_data.append({
                "text": prompt,
                "question": item['input'],
                "jose_response": item['output']
            })
        
        logger.info(f"✅ Prepared {len(training_data)} training examples for Jose")
        
        # Log some examples to verify character consistency
        logger.info("🎭 Sample Jose responses:")
        for i, example in enumerate(training_data[:2]):
            logger.info(f"\n--- Jose Example {i+1} ---")
            logger.info(f"Q: {example['question']}")
            logger.info(f"A: {example['jose_response'][:200]}...")
        
        return training_data
        
    def prepare_dataset(self, training_data: List[Dict]) -> Dataset:
        """Prepare dataset optimized for character training"""
        logger.info("🔧 Preparing Jose character dataset...")
        
        # Initialize TinyLlama 1.1B tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.config.model_name,
            padding_side="right",
            trust_remote_code=True,
            use_fast=True
        )
        
        # Set pad token
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            
        # Tokenize with character-specific parameters
        def tokenize_function(examples):
            return self.tokenizer(
                examples["text"],
                truncation=True,
                padding=False,
                max_length=self.config.max_length,
                return_tensors=None,
                add_special_tokens=False  # Already included in our format
            )
        
        # Create dataset
        texts = [item["text"] for item in training_data]
        dataset = Dataset.from_dict({"text": texts})
        
        # Apply tokenization
        dataset = dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=dataset.column_names,
            desc="Tokenizing Jose responses"
        )
        
        logger.info(f"✅ Dataset prepared: {len(dataset)} Jose character examples")
        return dataset
        
    def setup_model(self) -> AutoModelForCausalLM:
        """Setup TinyLlama 1.1B with QLoRA for Jose character training"""
        logger.info("🚀 Setting up TinyLlama 1.1B for Jose character training...")
        
        # 4-bit quantization config optimized for RTX 5090
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16  # Better for RTX 5090
        )
        
        # Load TinyLlama 1.1B with quantization
        model = AutoModelForCausalLM.from_pretrained(
            self.config.model_name,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.bfloat16,
            attn_implementation="flash_attention_2" if self.config.flash_attention else "eager",
            use_cache=False  # Disable for training
        )
        
        # Prepare for k-bit training
        model = prepare_model_for_kbit_training(
            model,
            use_gradient_checkpointing=self.config.gradient_checkpointing
        )
        
        # Enable gradient checkpointing
        if self.config.gradient_checkpointing:
            model.gradient_checkpointing_enable()
            
        # LoRA configuration for character fine-tuning
        lora_config = LoraConfig(
            r=self.config.lora_r,
            lora_alpha=self.config.lora_alpha,
            target_modules=self.config.target_modules,
            lora_dropout=self.config.lora_dropout,
            bias="none",
            task_type=TaskType.CAUSAL_LM,
            inference_mode=False
        )
        
        # Apply LoRA
        model = get_peft_model(model, lora_config)
        
        # Print trainable parameters
        model.print_trainable_parameters()
        
        logger.info("✅ TinyLlama 1.1B model setup complete for Jose training")
        return model
        
    def setup_trainer(self, model, dataset: Dataset) -> Trainer:
        """Setup trainer optimized for Jose character consistency"""
        logger.info("⚙️ Setting up trainer for Jose character training...")
        
        # Training arguments optimized for character fine-tuning
        training_args = TrainingArguments(
            output_dir="/home/luke/personal-ai-clone/web/training/jose_checkpoints",
            overwrite_output_dir=True,
            num_train_epochs=self.config.num_epochs,
            per_device_train_batch_size=self.config.batch_size,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            warmup_steps=self.config.warmup_steps,
            learning_rate=self.config.learning_rate,
            weight_decay=0.01,
            lr_scheduler_type="cosine",  # Better for character consistency
            bf16=True,  # Use BF16 for RTX 5090 stability
            logging_steps=5,
            save_steps=50,
            save_total_limit=3,
            prediction_loss_only=True,
            remove_unused_columns=False,
            dataloader_pin_memory=False,
            gradient_checkpointing=self.config.gradient_checkpointing,
            report_to="tensorboard",
            logging_dir="/home/luke/personal-ai-clone/web/training/jose_logs",
            seed=42,  # For reproducible Jose personality
            data_seed=42,
            group_by_length=True,  # Efficiency improvement
            ddp_find_unused_parameters=False
        )
        
        # Data collator for character training
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False,
            return_tensors="pt",
            pad_to_multiple_of=8  # Efficiency for RTX 5090
        )
        
        # Create trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            data_collator=data_collator,
            tokenizer=self.tokenizer,
        )
        
        logger.info("✅ Trainer setup complete for Jose character training")
        return trainer
        
    def monitor_gpu_usage(self):
        """Monitor RTX 5090 usage during Jose training"""
        if torch.cuda.is_available():
            memory_allocated = torch.cuda.memory_allocated(0) / (1024**3)
            memory_reserved = torch.cuda.memory_reserved(0) / (1024**3)
            gpu_utilization = memory_allocated / 24 * 100  # RTX 5090 has 24GB
            
            logger.info(f"🖥️ RTX 5090 Usage - Allocated: {memory_allocated:.2f}GB ({gpu_utilization:.1f}%), Reserved: {memory_reserved:.2f}GB")
            
            if memory_allocated > 22:
                logger.warning("⚠️ High memory usage detected - monitoring for OOM")
            
    def test_jose_character(self, model, test_questions: List[str] = None):
        """Test Jose character consistency during training"""
        if test_questions is None:
            test_questions = [
                "What's your job like?",
                "Tell me about working in construction.",
                "How long have you been in Brooklyn?"
            ]
        
        logger.info("🧪 Testing Jose character consistency...")
        
        model.eval()
        with torch.no_grad():
            for question in test_questions:
                prompt = f"""<|system|>
{self.config.system_prompt}</s>
<|user|>
{question}</s>
<|assistant|>
"""
                inputs = self.tokenizer(prompt, return_tensors="pt").to(model.device)
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=100,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id
                )
                response = self.tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
                logger.info(f"Q: {question}")
                logger.info(f"Jose: {response.strip()}")
                logger.info("---")
        
        model.train()
        
    def run_jose_training(self):
        """Execute complete Jose character training pipeline"""
        logger.info("🎭 Starting Jose Character Training on RTX 5090")
        logger.info(f"Character: {self.config.character_name} - {self.config.character_description}")
        
        try:
            # Step 1: Load Jose's training data
            logger.info("📂 Step 1: Loading Jose character data...")
            training_data = self.load_jose_training_data()
            
            # Step 2: Prepare dataset
            logger.info("🔧 Step 2: Preparing character dataset...")
            dataset = self.prepare_dataset(training_data)
            
            # Step 3: Setup model
            logger.info("🚀 Step 3: Setting up TinyLlama 1.1B model...")
            model = self.setup_model()
            
            # Step 4: Setup trainer
            logger.info("⚙️ Step 4: Configuring character trainer...")
            trainer = self.setup_trainer(model, dataset)
            
            # Step 5: Initial GPU monitoring
            self.monitor_gpu_usage()
            
            # Step 6: Test initial model (before training)
            logger.info("🧪 Testing initial model responses...")
            self.test_jose_character(model)
            
            # Step 7: Execute training
            logger.info("🔥 Step 7: Beginning Jose character training...")
            start_time = time.time()
            
            class JoseProgressCallback(TrainerCallback):
                def __init__(self, pipeline):
                    self.pipeline = pipeline
                    self.step_count = 0
                    
                def on_step_end(self, args, state, control, model=None, **kwargs):
                    self.step_count += 1
                    
                    if self.step_count % 10 == 0:
                        self.pipeline.monitor_gpu_usage()
                        
                def on_epoch_end(self, args, state, control, model=None, **kwargs):
                    logger.info(f"🎭 Epoch {state.epoch} completed - Testing Jose character...")
                    self.pipeline.test_jose_character(model, ["How's work going?"])
            
            # Add callback
            progress_callback = JoseProgressCallback(self)
            trainer.add_callback(progress_callback)
            
            # Train the model
            trainer.train()
            
            # Step 8: Save final Jose model
            logger.info("💾 Step 8: Saving final Jose character model...")
            final_model_path = "/home/luke/personal-ai-clone/web/training/jose_final_model"
            os.makedirs(final_model_path, exist_ok=True)
            trainer.save_model(final_model_path)
            
            # Step 9: Final character test
            logger.info("🧪 Step 9: Final Jose character validation...")
            comprehensive_test_questions = [
                "Tell me about your work in construction.",
                "What's it like living in Brooklyn?",
                "How long have you been doing this job?",
                "What's the hardest part of construction work?",
                "Tell me about your family."
            ]
            self.test_jose_character(model, comprehensive_test_questions)
            
            # Complete
            end_time = time.time()
            training_duration = end_time - start_time
            
            logger.info("🎉 Jose Character Training Complete!")
            logger.info(f"⏱️ Training duration: {training_duration:.2f} seconds ({training_duration/60:.1f} minutes)")
            logger.info(f"📁 Model saved to: {final_model_path}")
            
            return {
                "status": "completed",
                "character": self.config.character_name,
                "duration": training_duration,
                "model_path": final_model_path,
                "training_examples": len(training_data),
                "base_model": self.config.model_name
            }
            
        except Exception as e:
            logger.error(f"❌ Jose training failed: {str(e)}")
            raise

def main():
    """Main entry point for Jose character training"""
    logger.info("🎭 Jose Character Fine-tuning Pipeline Starting...")
    
    # Configure for Jose on RTX 5090
    config = JoseRTX5090Config()
    
    # Create pipeline
    pipeline = JoseTrainingPipeline(config)
    
    # Run Jose training
    result = pipeline.run_jose_training()
    
    logger.info(f"🎉 Jose training result: {result}")
    
if __name__ == "__main__":
    main()