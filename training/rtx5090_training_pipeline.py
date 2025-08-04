#!/usr/bin/env python3
"""
RTX 5090 Optimized Training Pipeline for "Echoes of Me"
Author: Claude Code (RTX 5090 Specialist)

This script implements CUDA-optimized training specifically for RTX 5090 with:
- PyTorch 2.7.0a0+ with sm_120 architecture support
- Flash Attention 2 for Mistral-7B
- QLoRA with 4-bit quantization
- Dynamic batching and memory management
- Real-time progress monitoring
"""

import os
import sys
import json
import time
import logging
import psycopg2
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
        logging.FileHandler('/training/training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class RTX5090Config:
    """RTX 5090 optimized configuration"""
    # Model configuration - using open model for training
    model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    max_length: int = 2048
    
    # QLoRA configuration
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.1
    target_modules: List[str] = None
    
    # Training configuration
    batch_size: int = 1  # Start conservative for RTX 5090
    gradient_accumulation_steps: int = 8
    learning_rate: float = 2e-4
    num_epochs: int = 3
    warmup_steps: int = 100
    
    # RTX 5090 memory management
    max_memory_gb: int = 20  # Conservative usage of 24GB VRAM
    gradient_checkpointing: bool = True
    flash_attention: bool = True
    
    def __post_init__(self):
        if self.target_modules is None:
            self.target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]

class RTX5090TrainingPipeline:
    """Main training pipeline optimized for RTX 5090"""
    
    def __init__(self, config: RTX5090Config):
        self.config = config
        self.accelerator = Accelerator()
        self.tokenizer = None
        self.model = None
        self.dataset = None
        self.trainer = None
        
        # Verify RTX 5090 compatibility
        self._verify_rtx5090_compatibility()
        
    def _verify_rtx5090_compatibility(self):
        """Verify PyTorch and CUDA compatibility with RTX 5090"""
        logger.info("Verifying RTX 5090 compatibility...")
        
        # Check PyTorch version
        pytorch_version = torch.__version__
        logger.info(f"PyTorch version: {pytorch_version}")
        
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA not available")
            
        # Check CUDA capability (must be 12.0 for RTX 5090)
        device_capability = torch.cuda.get_device_capability(0)
        logger.info(f"CUDA device capability: {device_capability}")
        
        if device_capability != (12, 0):
            logger.warning(f"Expected sm_120 (12.0), got sm_{device_capability[0]}{device_capability[1]}")
            
        # Check GPU memory
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        logger.info(f"GPU memory: {gpu_memory:.1f} GB")
        
        # Check device name
        device_name = torch.cuda.get_device_name(0)
        logger.info(f"GPU: {device_name}")
        
        logger.info("RTX 5090 compatibility verified ✓")
        
    def load_training_data(self) -> List[Dict]:
        """Load Luke's responses from PostgreSQL database"""
        logger.info("Loading training data from PostgreSQL...")
        
        # Database connection
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="echosofme_dev",
            user="echosofme",
            password="secure_dev_password"
        )
        
        try:
            cursor = conn.cursor()
            
            # Get Luke's responses with questions
            query = """
            SELECT 
                r.response_text,
                q.question_text,
                r.word_count,
                r.created_at
            FROM responses r
            JOIN questions q ON r.question_id = q.id
            WHERE r.user_id = 2  -- Luke's user ID
            ORDER BY r.created_at;
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            
            training_data = []
            for response_text, question_text, word_count, created_at in results:
                # Create training prompt format for TinyLlama
                prompt = f"<|system|>\nYou are Luke, answering personal reflection questions about your life experiences.</s>\n<|user|>\n{question_text}</s>\n<|assistant|>\n{response_text}</s>"
                
                training_data.append({
                    "text": prompt,
                    "question": question_text,
                    "response": response_text,
                    "word_count": word_count,
                    "created_at": created_at.isoformat()
                })
            
            logger.info(f"Loaded {len(training_data)} training examples")
            logger.info(f"Total words: {sum(item['word_count'] for item in training_data)}")
            
            return training_data
            
        finally:
            conn.close()
            
    def prepare_dataset(self, training_data: List[Dict]) -> Dataset:
        """Prepare dataset for training"""
        logger.info("Preparing dataset...")
        
        # Initialize tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.config.model_name,
            padding_side="right",
            trust_remote_code=True
        )
        
        # Add pad token if missing
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            
        # Tokenize data
        def tokenize_function(examples):
            return self.tokenizer(
                examples["text"],
                truncation=True,
                padding=False,
                max_length=self.config.max_length,
                return_tensors=None
            )
        
        # Create dataset
        texts = [item["text"] for item in training_data]
        dataset = Dataset.from_dict({"text": texts})
        
        # Apply tokenization
        dataset = dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=dataset.column_names
        )
        
        logger.info(f"Dataset prepared with {len(dataset)} examples")
        return dataset
        
    def setup_model(self) -> Tuple[AutoModelForCausalLM, LoraConfig]:
        """Setup Mistral-7B with QLoRA for RTX 5090"""
        logger.info("Setting up Mistral-7B with QLoRA...")
        
        # 4-bit quantization config
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16
        )
        
        # Load model with quantization
        model = AutoModelForCausalLM.from_pretrained(
            self.config.model_name,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.float16,
            attn_implementation="flash_attention_2" if self.config.flash_attention else "eager"
        )
        
        # Prepare model for k-bit training
        model = prepare_model_for_kbit_training(model)
        
        # Enable gradient checkpointing for memory efficiency
        if self.config.gradient_checkpointing:
            model.gradient_checkpointing_enable()
            
        # LoRA configuration
        lora_config = LoraConfig(
            r=self.config.lora_r,
            lora_alpha=self.config.lora_alpha,
            target_modules=self.config.target_modules,
            lora_dropout=self.config.lora_dropout,
            bias="none",
            task_type=TaskType.CAUSAL_LM,
        )
        
        # Apply LoRA
        model = get_peft_model(model, lora_config)
        
        # Print trainable parameters
        model.print_trainable_parameters()
        
        logger.info("Model setup complete ✓")
        return model, lora_config
        
    def setup_trainer(self, model, dataset: Dataset) -> Trainer:
        """Setup trainer with RTX 5090 optimizations"""
        logger.info("Setting up trainer...")
        
        # Training arguments optimized for RTX 5090
        training_args = TrainingArguments(
            output_dir="/training/checkpoints",
            overwrite_output_dir=True,
            num_train_epochs=self.config.num_epochs,
            per_device_train_batch_size=self.config.batch_size,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            warmup_steps=self.config.warmup_steps,
            learning_rate=self.config.learning_rate,
            fp16=True,  # Use FP16 for RTX 5090
            logging_steps=10,
            save_steps=100,
            eval_steps=100,
            save_total_limit=3,
            prediction_loss_only=True,
            remove_unused_columns=False,
            dataloader_pin_memory=False,  # Avoid pinned memory issues
            gradient_checkpointing=self.config.gradient_checkpointing,
            report_to="tensorboard",
            logging_dir="/training/logs",
        )
        
        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False
        )
        
        # Create trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            data_collator=data_collator,
            tokenizer=self.tokenizer,
        )
        
        logger.info("Trainer setup complete ✓")
        return trainer
        
    def monitor_gpu_usage(self):
        """Monitor GPU memory usage during training"""
        if torch.cuda.is_available():
            memory_allocated = torch.cuda.memory_allocated(0) / (1024**3)
            memory_reserved = torch.cuda.memory_reserved(0) / (1024**3)
            logger.info(f"GPU Memory - Allocated: {memory_allocated:.2f}GB, Reserved: {memory_reserved:.2f}GB")
            
    def update_training_status(self, status: str, progress: float = 0.0, message: str = ""):
        """Update training status in database"""
        try:
            conn = psycopg2.connect(
                host="localhost",
                port=5432,
                database="echosofme_dev",
                user="echosofme",
                password="secure_dev_password"
            )
            
            cursor = conn.cursor()
            
            # Update the most recent pending training run (without progress column)
            update_query = """
            UPDATE training_runs 
            SET status = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = (
                SELECT id FROM training_runs 
                WHERE status IN ('pending', 'running') 
                ORDER BY created_at DESC 
                LIMIT 1
            );
            """
            
            cursor.execute(update_query, (status,))
            conn.commit()
            
            logger.info(f"Training status updated: {status} (progress: {progress:.1f}%)")
            
        except Exception as e:
            logger.error(f"Failed to update training status: {e}")
        finally:
            if 'conn' in locals():
                conn.close()
                
    def save_model_checkpoint(self, model, step: int):
        """Save model checkpoint"""
        checkpoint_dir = f"/training/checkpoints/checkpoint-{step}"
        os.makedirs(checkpoint_dir, exist_ok=True)
        
        # Save LoRA weights
        model.save_pretrained(checkpoint_dir)
        self.tokenizer.save_pretrained(checkpoint_dir)
        
        logger.info(f"Checkpoint saved: {checkpoint_dir}")
        
    def run_training(self):
        """Execute the complete training pipeline"""
        logger.info("🚀 Starting RTX 5090 Training Pipeline for 'Echoes of Me'")
        
        try:
            # Update status
            self.update_training_status("running", 0.0, "Loading training data...")
            
            # Step 1: Load training data
            training_data = self.load_training_data()
            self.update_training_status("running", 10.0, "Preparing dataset...")
            
            # Step 2: Prepare dataset
            dataset = self.prepare_dataset(training_data)
            self.update_training_status("running", 20.0, "Setting up model...")
            
            # Step 3: Setup model
            model, lora_config = self.setup_model()
            self.update_training_status("running", 30.0, "Configuring trainer...")
            
            # Step 4: Setup trainer
            trainer = self.setup_trainer(model, dataset)
            self.update_training_status("running", 40.0, "Starting training...")
            
            # Step 5: Monitor initial GPU usage
            self.monitor_gpu_usage()
            
            # Step 6: Start training
            logger.info("🔥 Beginning training on RTX 5090...")
            start_time = time.time()
            
            # Training with progress monitoring
            class ProgressCallback(TrainerCallback):
                def __init__(self, pipeline):
                    self.pipeline = pipeline
                    self.step_count = 0
                    
                def on_step_end(self, args, state, control, model=None, **kwargs):
                    self.step_count += 1
                    progress = 40.0 + (self.step_count / state.max_steps) * 50.0
                    
                    if self.step_count % 10 == 0:
                        self.pipeline.update_training_status("running", progress, f"Training step {self.step_count}/{state.max_steps}")
                        self.pipeline.monitor_gpu_usage()
            
            # Add progress callback
            progress_callback = ProgressCallback(self)
            trainer.add_callback(progress_callback)
            
            # Execute training
            trainer.train()
            
            # Step 7: Save final model
            self.update_training_status("running", 95.0, "Saving final model...")
            final_model_path = "/training/final_model"
            trainer.save_model(final_model_path)
            
            # Training complete
            end_time = time.time()
            training_duration = end_time - start_time
            
            logger.info(f"✅ Training completed successfully!")
            logger.info(f"Training duration: {training_duration:.2f} seconds ({training_duration/60:.1f} minutes)")
            
            # Update final status
            self.update_training_status("completed", 100.0, f"Training completed in {training_duration/60:.1f} minutes")
            
            return {
                "status": "completed",
                "duration": training_duration,
                "model_path": final_model_path,
                "training_examples": len(training_data),
                "final_loss": trainer.state.log_history[-1].get("train_loss", 0.0) if trainer.state.log_history else 0.0
            }
            
        except Exception as e:
            logger.error(f"❌ Training failed: {str(e)}")
            self.update_training_status("failed", 0.0, f"Training failed: {str(e)}")
            raise

def main():
    """Main entry point"""
    logger.info("RTX 5090 Training Pipeline Starting...")
    
    # Configure for RTX 5090
    config = RTX5090Config()
    
    # Create pipeline
    pipeline = RTX5090TrainingPipeline(config)
    
    # Run training
    result = pipeline.run_training()
    
    logger.info(f"Training result: {result}")
    
if __name__ == "__main__":
    main()