#!/usr/bin/env python3
"""
Jose Character Fine-tuning - Simplified Version
Author: Claude Code (LLM Fine-tuning Specialist)

Simplified training without quantization to work with current PyTorch version.
Uses TinyLlama-1.1B-Chat-v1.0 with standard LoRA fine-tuning.
"""

import os
import sys
import json
import time
import logging
import torch
import torch.nn as nn
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
    TrainerCallback
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import Dataset

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/luke/personal-ai-clone/web/training/jose_simple_training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class JoseSimpleConfig:
    """Jose character training configuration - simplified"""
    # Base model - TinyLlama 1.1B (open, no quantization needed)
    model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    max_length: int = 1024  # Shorter for faster training
    
    # LoRA configuration
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.1
    target_modules: List[str] = None
    
    # Training configuration (CPU optimized)
    batch_size: int = 1  # Small batch for CPU
    gradient_accumulation_steps: int = 2  # Effective batch size of 2
    learning_rate: float = 2e-4
    num_epochs: int = 2  # Quick training for demonstration
    warmup_steps: int = 10
    
    # Jose character settings
    character_name: str = "Jose"
    character_description: str = "Brooklyn construction worker with authentic NY speech patterns"
    system_prompt: str = "You are Jose, a seasoned construction worker from Brooklyn, NY. You speak with authentic Brooklyn dialect, use construction terminology naturally, and have a straightforward, hardworking personality."
    
    def __post_init__(self):
        if self.target_modules is None:
            # TinyLlama target modules
            self.target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]

class JoseSimpleTrainer:
    """Simplified Jose character training"""
    
    def __init__(self, config: JoseSimpleConfig):
        self.config = config
        self.tokenizer = None
        self.model = None
        self.dataset = None
        
        # Check CUDA availability
        self._check_cuda()
        
    def _check_cuda(self):
        """Check CUDA availability"""
        logger.info("🔍 Checking CUDA compatibility...")
        
        if not torch.cuda.is_available():
            logger.warning("⚠️ CUDA not available, using CPU")
            return
            
        device_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        
        logger.info(f"✅ GPU: {device_name}")
        logger.info(f"✅ GPU Memory: {gpu_memory:.1f} GB")
        
        # Clear GPU cache
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    
    def load_jose_data(self) -> List[Dict]:
        """Load Jose character training data"""
        logger.info("📚 Loading Jose character data...")
        
        jose_file = '/home/luke/personal-ai-clone/web/jose_formatted_training.json'
        
        if not os.path.exists(jose_file):
            raise FileNotFoundError(f"Jose data not found: {jose_file}")
        
        with open(jose_file, 'r') as f:
            jose_data = json.load(f)
        
        logger.info(f"📊 Loaded {len(jose_data)} Jose examples")
        
        # Convert to TinyLlama format
        training_data = []
        for item in jose_data:
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
        
        logger.info(f"✅ Prepared {len(training_data)} training examples")
        
        # Show samples
        for i, example in enumerate(training_data[:2]):
            logger.info(f"\n--- Jose Sample {i+1} ---")
            logger.info(f"Q: {example['question']}")
            logger.info(f"A: {example['jose_response'][:100]}...")
        
        return training_data
    
    def prepare_dataset(self, training_data: List[Dict]) -> Dataset:
        """Prepare dataset for training"""
        logger.info("🔧 Preparing dataset...")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.config.model_name,
            padding_side="right",
            trust_remote_code=True
        )
        
        # Set pad token
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Tokenize
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
            desc="Tokenizing Jose data"
        )
        
        logger.info(f"✅ Dataset ready: {len(dataset)} examples")
        return dataset
    
    def setup_model(self) -> AutoModelForCausalLM:
        """Setup TinyLlama model with LoRA (no quantization)"""
        logger.info("🚀 Setting up TinyLlama model...")
        
        # Load model without quantization (force CPU due to CUDA compatibility)
        model = AutoModelForCausalLM.from_pretrained(
            self.config.model_name,
            torch_dtype=torch.float32,  # Use float32 for CPU
            trust_remote_code=True
        )
        
        # Explicitly move to CPU
        model = model.cpu()
        
        # LoRA configuration
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
        
        logger.info("✅ Model setup complete")
        return model
    
    def setup_trainer(self, model, dataset: Dataset) -> Trainer:
        """Setup trainer"""
        logger.info("⚙️ Setting up trainer...")
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir="/home/luke/personal-ai-clone/web/training/jose_simple_checkpoints",
            overwrite_output_dir=True,
            num_train_epochs=self.config.num_epochs,
            per_device_train_batch_size=self.config.batch_size,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            warmup_steps=self.config.warmup_steps,
            learning_rate=self.config.learning_rate,
            fp16=False,  # Disable FP16 for CPU training
            logging_steps=10,
            save_steps=50,
            save_total_limit=2,
            prediction_loss_only=True,
            remove_unused_columns=False,
            dataloader_pin_memory=False,
            report_to=None,  # Disable wandb/tensorboard
            seed=42
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
        
        logger.info("✅ Trainer ready")
        return trainer
    
    def test_jose_character(self, model, test_questions: List[str] = None):
        """Test Jose character"""
        if test_questions is None:
            test_questions = [
                "What's your job like?",
                "Tell me about Brooklyn.",
                "How long have you been in construction?"
            ]
        
        logger.info("🧪 Testing Jose character...")
        
        model.eval()
        with torch.no_grad():
            for question in test_questions:
                prompt = f"""<|system|>
{self.config.system_prompt}</s>
<|user|>
{question}</s>
<|assistant|>
"""
                
                inputs = self.tokenizer(prompt, return_tensors="pt")
                # Keep inputs on CPU
                
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=80,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id
                )
                
                response = self.tokenizer.decode(
                    outputs[0][inputs['input_ids'].shape[1]:], 
                    skip_special_tokens=True
                )
                
                logger.info(f"Q: {question}")
                logger.info(f"Jose: {response.strip()}")
                logger.info("---")
        
        model.train()
    
    def run_training(self):
        """Run complete Jose training"""
        logger.info("🎭 Starting Jose Character Training (Simplified)")
        logger.info(f"Character: {self.config.character_name} - {self.config.character_description}")
        
        try:
            # Step 1: Load data
            logger.info("📂 Step 1: Loading Jose data...")
            training_data = self.load_jose_data()
            
            # Step 2: Prepare dataset
            logger.info("🔧 Step 2: Preparing dataset...")
            dataset = self.prepare_dataset(training_data)
            
            # Step 3: Setup model
            logger.info("🚀 Step 3: Setting up model...")
            model = self.setup_model()
            
            # Step 4: Setup trainer
            logger.info("⚙️ Step 4: Setting up trainer...")
            trainer = self.setup_trainer(model, dataset)
            
            # Step 5: Test initial model
            logger.info("🧪 Step 5: Testing initial model...")
            self.test_jose_character(model)
            
            # Step 6: Train
            logger.info("🔥 Step 6: Starting training...")
            start_time = time.time()
            
            class ProgressCallback(TrainerCallback):
                def __init__(self, jose_trainer):
                    self.jose_trainer = jose_trainer
                    self.step_count = 0
                    
                def on_step_end(self, args, state, control, model=None, **kwargs):
                    self.step_count += 1
                    if self.step_count % 20 == 0:
                        logger.info(f"Training step {self.step_count} (CPU mode)")
                
                def on_epoch_end(self, args, state, control, model=None, **kwargs):
                    logger.info(f"🎭 Epoch {state.epoch} complete - Testing Jose...")
                    self.jose_trainer.test_jose_character(model, ["How's work going?"])
            
            # Add callback
            progress_callback = ProgressCallback(self)
            trainer.add_callback(progress_callback)
            
            # Train
            trainer.train()
            
            # Step 7: Save model
            logger.info("💾 Step 7: Saving final model...")
            final_model_path = "/home/luke/personal-ai-clone/web/training/jose_simple_final"
            os.makedirs(final_model_path, exist_ok=True)
            trainer.save_model(final_model_path)
            
            # Step 8: Final test
            logger.info("🧪 Step 8: Final Jose test...")
            final_test_questions = [
                "Tell me about your construction work.",
                "What's Brooklyn like?",
                "How long have you been doing this job?",
                "What do you think about your work?",
                "Tell me about your family."
            ]
            self.test_jose_character(model, final_test_questions)
            
            # Complete
            end_time = time.time()
            training_duration = end_time - start_time
            
            logger.info("🎉 Jose Training Complete!")
            logger.info(f"⏱️ Duration: {training_duration:.2f} seconds ({training_duration/60:.1f} minutes)")
            logger.info(f"📁 Model saved: {final_model_path}")
            
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
    """Main entry point"""
    logger.info("🎭 Jose Simple Character Training Starting...")
    
    # Create config
    config = JoseSimpleConfig()
    
    # Create trainer
    trainer = JoseSimpleTrainer(config)
    
    # Run training
    result = trainer.run_training()
    
    logger.info(f"🎉 Training result: {result}")

if __name__ == "__main__":
    main()