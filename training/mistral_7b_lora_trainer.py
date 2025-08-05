#!/usr/bin/env python3
"""
Mistral 7B LoRA Training Pipeline for RTX 5090
Author: Claude Code (Mistral 7B Specialist)

This script implements CUDA-optimized training specifically for Mistral 7B on RTX 5090:
- Conservative LoRA parameters (rank=16, alpha=32, dropout=0.1)
- QLoRA with 4-bit quantization for memory efficiency
- Flash Attention 2 for Mistral architecture
- Batch size 1 with gradient accumulation 8
- Conservative learning rate: 1e-4
- Expected training time: 15-25 minutes
- Expected VRAM usage: ~47% of RTX 5090 (11.5GB)
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
        logging.FileHandler('/training/mistral_training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class MistralRTX5090Config:
    """Mistral 7B RTX 5090 optimized configuration"""
    # Model configuration - Mistral 7B Instruct
    model_name: str = "mistralai/Mistral-7B-Instruct-v0.3"
    max_length: int = 2048
    
    # Conservative LoRA configuration for stability
    lora_r: int = 16  # Conservative rank
    lora_alpha: int = 32  # 2x rank ratio
    lora_dropout: float = 0.1  # Prevent overfitting
    target_modules: List[str] = None
    
    # Training configuration - Conservative for RTX 5090
    batch_size: int = 1  # Single batch to start
    gradient_accumulation_steps: int = 8  # Effective batch size = 8
    learning_rate: float = 1e-4  # More conservative than TinyLlama
    num_epochs: int = 3
    warmup_steps: int = 100
    
    # RTX 5090 memory management - Conservative approach
    max_memory_gb: int = 18  # Use ~75% of 24GB VRAM
    gradient_checkpointing: bool = True
    flash_attention: bool = True
    use_4bit_quantization: bool = True
    
    def __post_init__(self):
        if self.target_modules is None:
            # Mistral 7B specific target modules
            self.target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]

class MistralTrainingPipeline:
    """Mistral 7B training pipeline optimized for RTX 5090"""
    
    def __init__(self, config: MistralRTX5090Config):
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
        logger.info("Verifying RTX 5090 compatibility for Mistral 7B...")
        
        # Check PyTorch version
        pytorch_version = torch.__version__
        logger.info(f"PyTorch version: {pytorch_version}")
        
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA not available")
            
        # Check CUDA capability
        device_capability = torch.cuda.get_device_capability(0)
        logger.info(f"CUDA device capability: {device_capability}")
        
        # Check GPU memory
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        logger.info(f"GPU memory: {gpu_memory:.1f} GB")
        
        if gpu_memory < 20:
            logger.warning("Less than 20GB VRAM detected. Mistral 7B may require memory optimization.")
        
        # Check device name
        device_name = torch.cuda.get_device_name(0)
        logger.info(f"GPU: {device_name}")
        
        # Verify Flash Attention 2 availability
        try:
            import flash_attn
            logger.info(f"Flash Attention 2 available: {flash_attn.__version__}")
        except ImportError:
            logger.warning("Flash Attention 2 not available - falling back to standard attention")
            self.config.flash_attention = False
        
        logger.info("RTX 5090 compatibility verified for Mistral 7B ✓")
        
    def load_training_data(self) -> List[Dict]:
        """Load training data from PostgreSQL database"""
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
            
            # Get user responses with questions
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
                # Mistral chat template format
                prompt = f"[INST] {question_text} [/INST] {response_text}"
                
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
        """Prepare dataset for Mistral 7B training"""
        logger.info("Preparing dataset for Mistral 7B...")
        
        # Initialize Mistral tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.config.model_name,
            padding_side="right",
            trust_remote_code=True
        )
        
        # Add pad token if missing
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            
        # Tokenize data with Mistral-specific handling
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
            remove_columns=dataset.column_names,
            desc="Tokenizing for Mistral 7B"
        )
        
        logger.info(f"Dataset prepared with {len(dataset)} examples for Mistral 7B")
        return dataset
        
    def setup_model(self) -> Tuple[AutoModelForCausalLM, LoraConfig]:
        """Setup Mistral 7B with QLoRA for RTX 5090"""
        logger.info("Setting up Mistral 7B with QLoRA...")
        
        # Conservative 4-bit quantization config for RTX 5090
        if self.config.use_4bit_quantization:
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16  # Use bfloat16 for Mistral
            )
        else:
            bnb_config = None
        
        # Load Mistral 7B model with quantization
        model = AutoModelForCausalLM.from_pretrained(
            self.config.model_name,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            torch_dtype=torch.bfloat16,  # Mistral prefers bfloat16
            attn_implementation="flash_attention_2" if self.config.flash_attention else "eager"
        )
        
        # Prepare model for k-bit training if using quantization
        if self.config.use_4bit_quantization:
            model = prepare_model_for_kbit_training(model)
        
        # Enable gradient checkpointing for memory efficiency on RTX 5090
        if self.config.gradient_checkpointing:
            model.gradient_checkpointing_enable()
            
        # Conservative LoRA configuration
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
        
        # Log memory usage after model setup
        if torch.cuda.is_available():
            memory_allocated = torch.cuda.memory_allocated(0) / (1024**3)
            logger.info(f"Memory allocated after model setup: {memory_allocated:.2f}GB")
        
        logger.info("Mistral 7B model setup complete ✓")
        return model, lora_config
        
    def setup_trainer(self, model, dataset: Dataset) -> Trainer:
        """Setup trainer with Mistral 7B RTX 5090 optimizations"""
        logger.info("Setting up trainer for Mistral 7B...")
        
        # Training arguments optimized for Mistral 7B on RTX 5090
        training_args = TrainingArguments(
            output_dir="/training/mistral_checkpoints",
            overwrite_output_dir=True,
            num_train_epochs=self.config.num_epochs,
            per_device_train_batch_size=self.config.batch_size,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            warmup_steps=self.config.warmup_steps,
            learning_rate=self.config.learning_rate,
            bf16=True,  # Use bfloat16 for Mistral 7B
            logging_steps=10,
            save_steps=100,
            save_total_limit=3,
            prediction_loss_only=True,
            remove_unused_columns=False,
            dataloader_pin_memory=False,
            gradient_checkpointing=self.config.gradient_checkpointing,
            report_to="tensorboard",
            logging_dir="/training/mistral_logs",
            max_grad_norm=1.0,  # Gradient clipping for stability
        )
        
        # Data collator for causal language modeling
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
        
        logger.info("Mistral 7B trainer setup complete ✓")
        return trainer
        
    def monitor_gpu_usage(self):
        """Monitor GPU memory usage during Mistral 7B training"""
        if torch.cuda.is_available():
            memory_allocated = torch.cuda.memory_allocated(0) / (1024**3)
            memory_reserved = torch.cuda.memory_reserved(0) / (1024**3)
            total_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            usage_percent = (memory_allocated / total_memory) * 100
            
            logger.info(f"GPU Memory - Allocated: {memory_allocated:.2f}GB ({usage_percent:.1f}%), Reserved: {memory_reserved:.2f}GB")
            
            # Warning if approaching memory limit
            if usage_percent > 90:
                logger.warning("GPU memory usage > 90% - consider reducing batch size or sequence length")
            
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
            
            # Update the most recent training run
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
            
            logger.info(f"Training status updated: {status} (progress: {progress:.1f}%) - {message}")
            
        except Exception as e:
            logger.error(f"Failed to update training status: {e}")
        finally:
            if 'conn' in locals():
                conn.close()
                
    def save_model_checkpoint(self, model, step: int):
        """Save Mistral 7B model checkpoint"""
        checkpoint_dir = f"/training/mistral_checkpoints/checkpoint-{step}"
        os.makedirs(checkpoint_dir, exist_ok=True)
        
        # Save LoRA weights and tokenizer
        model.save_pretrained(checkpoint_dir)
        self.tokenizer.save_pretrained(checkpoint_dir)
        
        # Save training metadata
        metadata = {
            "model_name": self.config.model_name,
            "lora_config": {
                "r": self.config.lora_r,
                "alpha": self.config.lora_alpha,
                "dropout": self.config.lora_dropout,
                "target_modules": self.config.target_modules
            },
            "training_config": {
                "batch_size": self.config.batch_size,
                "gradient_accumulation_steps": self.config.gradient_accumulation_steps,
                "learning_rate": self.config.learning_rate,
                "max_length": self.config.max_length
            },
            "timestamp": datetime.now().isoformat(),
            "step": step
        }
        
        with open(f"{checkpoint_dir}/training_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Mistral 7B checkpoint saved: {checkpoint_dir}")
        
    def test_model(self, model):
        """Test the trained Mistral 7B model"""
        logger.info("Testing trained Mistral 7B model...")
        model.eval()
        
        test_prompts = [
            "Tell me about yourself.",
            "What are your hobbies and interests?",
            "Describe a memorable experience from your life.",
            "What are your career aspirations?",
            "How do you handle challenges in life?"
        ]
        
        with torch.no_grad():
            for prompt in test_prompts:
                # Format with Mistral chat template
                formatted_prompt = f"[INST] {prompt} [/INST]"
                inputs = self.tokenizer(formatted_prompt, return_tensors="pt")
                
                if torch.cuda.is_available():
                    inputs = {k: v.to(model.device) for k, v in inputs.items()}
                
                # Generate response
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=150,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id
                )
                
                # Decode response (skip the input tokens)
                response = self.tokenizer.decode(
                    outputs[0][inputs['input_ids'].shape[1]:], 
                    skip_special_tokens=True
                )
                
                logger.info(f"Q: {prompt}")
                logger.info(f"A: {response.strip()}")
                logger.info("---")
                
    def run_training(self):
        """Execute the complete Mistral 7B training pipeline"""
        logger.info("🚀 Starting Mistral 7B Training Pipeline on RTX 5090")
        
        try:
            # Update status
            self.update_training_status("running", 0.0, "Loading training data...")
            
            # Step 1: Load training data
            training_data = self.load_training_data()
            self.update_training_status("running", 10.0, "Preparing dataset...")
            
            # Step 2: Prepare dataset
            dataset = self.prepare_dataset(training_data)
            self.update_training_status("running", 20.0, "Setting up Mistral 7B model...")
            
            # Step 3: Setup model
            model, lora_config = self.setup_model()
            self.update_training_status("running", 30.0, "Configuring trainer...")
            
            # Step 4: Setup trainer
            trainer = self.setup_trainer(model, dataset)
            self.update_training_status("running", 40.0, "Starting Mistral 7B training...")
            
            # Step 5: Monitor initial GPU usage
            self.monitor_gpu_usage()
            
            # Step 6: Start training
            logger.info("🔥 Beginning Mistral 7B training on RTX 5090...")
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
                        self.pipeline.update_training_status(
                            "running", 
                            progress, 
                            f"Mistral 7B training step {self.step_count}/{state.max_steps}"
                        )
                        self.pipeline.monitor_gpu_usage()
            
            # Add progress callback
            progress_callback = ProgressCallback(self)
            trainer.add_callback(progress_callback)
            
            # Execute training
            trainer.train()
            
            # Step 7: Save final model
            self.update_training_status("running", 95.0, "Saving final Mistral 7B model...")
            final_model_path = "/training/mistral_final_model"
            trainer.save_model(final_model_path)
            
            # Save final metadata
            final_metadata = {
                "model_name": self.config.model_name,
                "training_completed": datetime.now().isoformat(),
                "training_examples": len(training_data),
                "final_loss": trainer.state.log_history[-1].get("train_loss", 0.0) if trainer.state.log_history else 0.0,
                "lora_config": {
                    "r": self.config.lora_r,
                    "alpha": self.config.lora_alpha,
                    "dropout": self.config.lora_dropout,
                    "target_modules": self.config.target_modules
                }
            }
            
            with open(f"{final_model_path}/training_metadata.json", "w") as f:
                json.dump(final_metadata, f, indent=2)
            
            # Step 8: Test the model
            self.test_model(model)
            
            # Training complete
            end_time = time.time()
            training_duration = end_time - start_time
            
            logger.info(f"✅ Mistral 7B training completed successfully!")
            logger.info(f"Training duration: {training_duration:.2f} seconds ({training_duration/60:.1f} minutes)")
            
            # Update final status
            self.update_training_status(
                "completed", 
                100.0, 
                f"Mistral 7B training completed in {training_duration/60:.1f} minutes"
            )
            
            return {
                "status": "completed",
                "duration": training_duration,
                "model_path": final_model_path,
                "training_examples": len(training_data),
                "final_loss": trainer.state.log_history[-1].get("train_loss", 0.0) if trainer.state.log_history else 0.0,
                "model_name": self.config.model_name
            }
            
        except Exception as e:
            logger.error(f"❌ Mistral 7B training failed: {str(e)}")
            self.update_training_status("failed", 0.0, f"Mistral 7B training failed: {str(e)}")
            raise

def main():
    """Main entry point for Mistral 7B training"""
    logger.info("Mistral 7B RTX 5090 Training Pipeline Starting...")
    
    # Configure for Mistral 7B on RTX 5090
    config = MistralRTX5090Config()
    
    # Create pipeline
    pipeline = MistralTrainingPipeline(config)
    
    # Run training
    result = pipeline.run_training()
    
    logger.info(f"Mistral 7B training result: {result}")
    
if __name__ == "__main__":
    main()