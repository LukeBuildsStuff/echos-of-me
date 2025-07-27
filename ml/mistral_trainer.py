"""
Mistral 7B Fine-tuning for Legacy Preservation
Optimized for RTX 5090 (24GB VRAM)
"""

import os
import json
import torch
import requests
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
from transformers import (
    AutoTokenizer, AutoModelForCausalLM,
    TrainingArguments, Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import Dataset
import evaluate
from tqdm import tqdm
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/workspace/logs/training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MistralTrainer:
    def __init__(self, config: Dict[str, Any]):
        """Initialize Mistral trainer with configuration."""
        self.config = config
        self.model_name = "mistralai/Mistral-7B-Instruct-v0.2"
        self.tokenizer = None
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Training parameters optimized for RTX 5090
        self.training_args = TrainingArguments(
            output_dir="/models/checkpoints",
            overwrite_output_dir=True,
            num_train_epochs=3,
            per_device_train_batch_size=4,  # Optimized for 24GB VRAM
            per_device_eval_batch_size=4,
            gradient_accumulation_steps=4,  # Effective batch size: 16
            warmup_steps=100,
            max_steps=1000,
            learning_rate=2e-5,
            fp16=True,  # Use mixed precision
            logging_steps=10,
            logging_dir="/workspace/logs",
            evaluation_strategy="steps",
            eval_steps=100,
            save_strategy="steps",
            save_steps=100,
            save_total_limit=3,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            dataloader_pin_memory=True,
            dataloader_num_workers=4,
            remove_unused_columns=False,
            report_to="none",  # Disable wandb for now
        )
        
        # LoRA configuration for efficient fine-tuning
        self.lora_config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            r=16,  # Rank
            lora_alpha=32,  # Alpha parameter
            lora_dropout=0.1,
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
            bias="none",
        )

    def load_model_and_tokenizer(self):
        """Load Mistral model and tokenizer."""
        logger.info(f"Loading model and tokenizer: {self.model_name}")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_name,
            cache_dir="/models/huggingface",
            trust_remote_code=True
        )
        
        # Add padding token if not exists
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            
        # Load model
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            cache_dir="/models/huggingface",
            torch_dtype=torch.float16,  # Use half precision
            device_map="auto",
            trust_remote_code=True,
            use_flash_attention_2=True  # Enable Flash Attention 2
        )
        
        # Apply LoRA
        self.model = get_peft_model(self.model, self.lora_config)
        
        logger.info(f"Model loaded on device: {self.device}")
        logger.info(f"Trainable parameters: {self.model.get_nb_trainable_parameters()}")
        
    def fetch_training_data(self, user_id: Optional[str] = None) -> List[Dict]:
        """Fetch training data from the web API."""
        logger.info("Fetching training data from API...")
        
        try:
            # Call the web API to get training data
            api_url = "http://web:3000/api/training/prepare-data"
            params = {}
            if user_id:
                params['userId'] = user_id
                
            response = requests.get(api_url, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if not data.get('readyForTraining', False):
                logger.warning("Not enough data for training yet")
                logger.info(f"Recommendations: {data.get('recommendations', [])}")
                return []
                
            training_examples = data['examples']['conversational']
            logger.info(f"Fetched {len(training_examples)} training examples")
            
            return training_examples
            
        except Exception as e:
            logger.error(f"Failed to fetch training data: {e}")
            return []

    def prepare_dataset(self, training_examples: List[Dict]) -> Dataset:
        """Prepare dataset for training."""
        logger.info("Preparing dataset...")
        
        formatted_texts = []
        
        for example in training_examples:
            messages = example['messages']
            
            # Format as Mistral instruction format
            conversation = ""
            for message in messages:
                if message['role'] == 'system':
                    continue  # Skip system messages for now
                elif message['role'] == 'user':
                    conversation += f"<s>[INST] {message['content']} [/INST] "
                elif message['role'] == 'assistant':
                    conversation += f"{message['content']}</s>"
                    
            formatted_texts.append(conversation)
        
        # Tokenize the dataset
        def tokenize_function(examples):
            return self.tokenizer(
                examples['text'],
                truncation=True,
                padding=True,
                max_length=2048,  # Context length for Mistral
                return_tensors="pt"
            )
        
        # Create dataset
        dataset = Dataset.from_dict({"text": formatted_texts})
        tokenized_dataset = dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=["text"]
        )
        
        # Split into train/validation
        split_dataset = tokenized_dataset.train_test_split(test_size=0.1, seed=42)
        
        logger.info(f"Dataset prepared: {len(split_dataset['train'])} train, {len(split_dataset['test'])} validation")
        
        return split_dataset

    def train_model(self, dataset: Dataset) -> Dict[str, Any]:
        """Train the model."""
        logger.info("Starting model training...")
        
        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False,  # Causal LM, not masked LM
        )
        
        # Initialize trainer
        trainer = Trainer(
            model=self.model,
            args=self.training_args,
            train_dataset=dataset['train'],
            eval_dataset=dataset['test'],
            data_collator=data_collator,
            tokenizer=self.tokenizer,
        )
        
        # Train the model
        training_result = trainer.train()
        
        # Save the model
        model_path = f"/models/checkpoints/mistral-7b-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        trainer.save_model(model_path)
        
        logger.info(f"Training completed. Model saved to: {model_path}")
        
        return {
            "model_path": model_path,
            "training_loss": training_result.training_loss,
            "train_runtime": training_result.metrics["train_runtime"],
            "train_samples_per_second": training_result.metrics["train_samples_per_second"],
            "eval_loss": trainer.evaluate()["eval_loss"] if dataset['test'] else None
        }

    def evaluate_model(self, dataset: Dataset) -> Dict[str, float]:
        """Evaluate the trained model."""
        logger.info("Evaluating model...")
        
        # Basic evaluation using perplexity
        trainer = Trainer(
            model=self.model,
            args=self.training_args,
            eval_dataset=dataset['test'],
            tokenizer=self.tokenizer,
        )
        
        eval_results = trainer.evaluate()
        
        # Calculate perplexity
        perplexity = torch.exp(torch.tensor(eval_results["eval_loss"]))
        eval_results["perplexity"] = perplexity.item()
        
        logger.info(f"Evaluation results: {eval_results}")
        
        return eval_results

    def update_training_record(self, user_id: str, results: Dict[str, Any]):
        """Update training record in the database."""
        try:
            api_url = "http://web:3000/api/training/schedule"
            
            payload = {
                "action": "update_training_result",
                "userId": user_id,
                "results": results,
                "status": "completed" if results.get("training_loss") else "failed"
            }
            
            response = requests.post(api_url, json=payload, timeout=30)
            response.raise_for_status()
            
            logger.info("Training record updated successfully")
            
        except Exception as e:
            logger.error(f"Failed to update training record: {e}")

    def run_training_pipeline(self, user_id: Optional[str] = None) -> bool:
        """Run the complete training pipeline."""
        try:
            logger.info("Starting Mistral 7B training pipeline...")
            
            # Check GPU availability
            if not torch.cuda.is_available():
                logger.error("CUDA not available. Cannot train model.")
                return False
                
            logger.info(f"GPU: {torch.cuda.get_device_name()}")
            logger.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
            
            # Load model and tokenizer
            self.load_model_and_tokenizer()
            
            # Fetch training data
            training_examples = self.fetch_training_data(user_id)
            if not training_examples:
                logger.warning("No training data available. Skipping training.")
                return False
            
            # Prepare dataset
            dataset = self.prepare_dataset(training_examples)
            
            # Train model
            training_results = self.train_model(dataset)
            
            # Evaluate model
            eval_results = self.evaluate_model(dataset)
            
            # Combine results
            final_results = {**training_results, **eval_results}
            
            # Update training record
            if user_id:
                self.update_training_record(user_id, final_results)
            
            logger.info("Training pipeline completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Training pipeline failed: {e}")
            if user_id:
                self.update_training_record(user_id, {"error": str(e)})
            return False

def main():
    """Main training function."""
    # Default configuration
    config = {
        "model_name": "mistralai/Mistral-7B-Instruct-v0.2",
        "max_length": 2048,
        "batch_size": 4,
        "learning_rate": 2e-5,
        "num_epochs": 3
    }
    
    # Initialize trainer
    trainer = MistralTrainer(config)
    
    # Run training
    success = trainer.run_training_pipeline()
    
    if success:
        logger.info("Training completed successfully!")
    else:
        logger.error("Training failed!")
        
    return success

if __name__ == "__main__":
    main()