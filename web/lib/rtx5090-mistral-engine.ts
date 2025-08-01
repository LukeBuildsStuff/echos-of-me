/**
 * RTX 5090 Optimized Mistral Training Engine
 * 
 * Specialized training engine for Mistral-7B models on RTX 5090 (sm_120)
 * Optimized for family legacy preservation with 32GB VRAM utilization
 */

import { TrainingConfig, TrainingJob, TrainingExample, TrainingMetrics } from './ai-training-config'
import { query } from './db'
import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

export interface RTX5090MistralConfig {
  // Hardware Specifications
  vramSize: 32 // GB
  computeCapability: '12.0' // sm_120
  tensorCores: boolean
  
  // Mistral-Specific Optimizations
  mistralConfig: {
    baseModel: string
    contextLength: number
    slidingWindow: number
    useRotaryEmbeddings: boolean
    groupedQueryAttention: boolean
  }
  
  // RTX 5090 Memory Optimizations
  memoryConfig: {
    maxSequenceLength: number
    dynamicBatching: boolean
    gradientCheckpointing: boolean
    flashAttention2: boolean
    memoryEfficientAttention: boolean
  }
  
  // Training Optimizations
  trainingConfig: {
    useAdamW8bit: boolean
    useLoRAPlus: boolean
    enableDeepspeedZeRO: boolean
    mixedPrecision: 'bf16' | 'fp16'
  }
}

export const rtx5090MistralConfig: RTX5090MistralConfig = {
  vramSize: 32,
  computeCapability: '12.0',
  tensorCores: true,
  
  mistralConfig: {
    baseModel: 'mistralai/Mistral-7B-Instruct-v0.3',
    contextLength: 32768,
    slidingWindow: 4096,
    useRotaryEmbeddings: true,
    groupedQueryAttention: true
  },
  
  memoryConfig: {
    maxSequenceLength: 4096, // Conservative for training
    dynamicBatching: true,
    gradientCheckpointing: true,
    flashAttention2: true,
    memoryEfficientAttention: true
  },
  
  trainingConfig: {
    useAdamW8bit: true,
    useLoRAPlus: true,
    enableDeepspeedZeRO: false, // Single GPU setup
    mixedPrecision: 'bf16'
  }
}

export class RTX5090MistralEngine {
  private activeJobs: Map<string, ChildProcess> = new Map()
  private config: RTX5090MistralConfig
  private metricsCallback?: (jobId: string, metrics: TrainingMetrics) => void

  constructor(config?: Partial<RTX5090MistralConfig>) {
    this.config = { ...rtx5090MistralConfig, ...config }
    this.setupEnvironment()
  }

  /**
   * Setup RTX 5090 environment for Mistral training
   */
  private async setupEnvironment() {
    try {
      // Ensure training directories exist
      await fs.mkdir('/tmp/ai-training', { recursive: true })
      await fs.mkdir('/tmp/ai-training/models', { recursive: true })
      await fs.mkdir('/tmp/ai-training/checkpoints', { recursive: true })
      await fs.mkdir('/tmp/ai-training/logs', { recursive: true })
      await fs.mkdir('/tmp/ai-training/scripts', { recursive: true })

      // Create RTX 5090 environment setup script
      const envSetupScript = `#!/usr/bin/env python3
"""
RTX 5090 Environment Setup for Mistral Training
"""
import os
import torch

# RTX 5090 sm_120 Environment Variables
os.environ.update({
    'CUDA_VISIBLE_DEVICES': '0',
    'PYTORCH_CUDA_ALLOC_CONF': 'max_split_size_mb:2048,expandable_segments:True,roundup_power2_divisions:16',
    'TORCH_CUDNN_V8_API_ENABLED': '1',
    'CUDA_LAUNCH_BLOCKING': '0',
    'NCCL_P2P_DISABLE': '1',
    'CUDA_DEVICE_MAX_CONNECTIONS': '1',
    'PYTORCH_KERNEL_CACHE_PATH': '/tmp/pytorch_kernel_cache',
    'TORCH_COMPILE_CACHE_DIR': '/tmp/torch_compile_cache'
})

# RTX 5090 Tensor Core Optimizations
if torch.cuda.is_available():
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True
    torch.backends.cuda.matmul.allow_fp16_reduced_precision_reduction = True
    torch.backends.cudnn.benchmark = True
    torch.backends.cudnn.deterministic = False
    
    # Set memory fraction for 32GB VRAM
    torch.cuda.set_memory_fraction(0.95)
    
    # Verify RTX 5090 capability
    capability = torch.cuda.get_device_capability(0)
    if capability[0] >= 12:  # sm_120 or higher
        print(f"✓ RTX 5090 sm_{capability[0]}{capability[1]} support confirmed")
        print(f"✓ VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB")
    else:
        print(f"⚠ Warning: Expected sm_120, found sm_{capability[0]}{capability[1]}")

print("RTX 5090 environment configured for Mistral training")
`
      
      await fs.writeFile('/tmp/ai-training/scripts/rtx5090_setup.py', envSetupScript)
      await fs.chmod('/tmp/ai-training/scripts/rtx5090_setup.py', 0o755)

    } catch (error) {
      console.error('Failed to setup RTX 5090 environment:', error)
    }
  }

  /**
   * Generate optimized Mistral training script for RTX 5090
   */
  async generateMistralTrainingScript(job: TrainingJob, dataPath: string): Promise<string> {
    const scriptPath = join('/tmp/ai-training/scripts', `${job.id}_mistral_rtx5090_train.py`)
    
    const script = `#!/usr/bin/env python3
"""
RTX 5090 Optimized Mistral-7B Training Script for Family Legacy Preservation
Generated for job: ${job.id}
Model: ${this.config.mistralConfig.baseModel}
VRAM: ${this.config.vramSize}GB RTX 5090 (sm_120)
"""

import os
import sys
import json
import torch
import torch.nn as nn
import torch.distributed as dist
from torch.cuda.amp import autocast, GradScaler
from torch.utils.data import DataLoader
import transformers
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
    BitsAndBytesConfig,
    MistralConfig
)
from datasets import load_dataset, Dataset
import logging
import time
import gc
from datetime import datetime
import warnings
warnings.filterwarnings("ignore")

# Advanced optimization imports
try:
    import flash_attn
    from flash_attn import flash_attn_func
    FLASH_ATTENTION_2_AVAILABLE = True
    print("✓ Flash Attention 2 available")
except ImportError:
    FLASH_ATTENTION_2_AVAILABLE = False
    print("⚠ Flash Attention 2 not available")

try:
    from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training
    import bitsandbytes as bnb
    PEFT_AVAILABLE = True
    print("✓ PEFT available")
except ImportError:
    PEFT_AVAILABLE = False
    print("⚠ PEFT not available")

try:
    from accelerate import Accelerator
    ACCELERATE_AVAILABLE = True
    print("✓ Accelerate available")
except ImportError:
    ACCELERATE_AVAILABLE = False
    print("⚠ Accelerate not available")

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RTX5090MistralTrainer:
    """Optimized Mistral trainer for RTX 5090"""
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.start_time = time.time()
        self.setup_environment()
        
    def setup_environment(self):
        """Setup RTX 5090 optimized environment"""
        
        # RTX 5090 specific optimizations
        os.environ.update({
            'CUDA_VISIBLE_DEVICES': '0',
            'PYTORCH_CUDA_ALLOC_CONF': 'max_split_size_mb:2048,expandable_segments:True',
            'TORCH_CUDNN_V8_API_ENABLED': '1',
            'CUDA_LAUNCH_BLOCKING': '0',
            'PYTORCH_KERNEL_CACHE_PATH': '/tmp/pytorch_kernel_cache'
        })
        
        if torch.cuda.is_available():
            # RTX 5090 Tensor Core optimizations
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            torch.backends.cuda.matmul.allow_fp16_reduced_precision_reduction = True
            torch.backends.cudnn.benchmark = True
            torch.backends.cudnn.deterministic = False
            
            # Memory management for 32GB VRAM
            torch.cuda.set_memory_fraction(0.95)
            torch.cuda.empty_cache()
            
            capability = torch.cuda.get_device_capability(0)
            logger.info(f"RTX 5090 sm_{capability[0]}{capability[1]} initialized")
            logger.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB")
        
    def setup_model_and_tokenizer(self):
        """Setup Mistral model with RTX 5090 optimizations"""
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained("${this.config.mistralConfig.baseModel}")
        
        # Ensure proper tokenizer setup
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
            tokenizer.pad_token_id = tokenizer.eos_token_id
        
        # Configure BitsAndBytes for RTX 5090
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_quant_storage=torch.uint8,
        )
        
        # Model loading configuration for RTX 5090
        model_kwargs = {
            'quantization_config': bnb_config,
            'torch_dtype': torch.bfloat16,
            'device_map': "auto",
            'trust_remote_code': True,
            'use_cache': False,  # Disable during training
            'low_cpu_mem_usage': True,
        }
        
        # Enable Flash Attention 2 for RTX 5090
        if FLASH_ATTENTION_2_AVAILABLE:
            model_kwargs['attn_implementation'] = "flash_attention_2"
            logger.info("Flash Attention 2 enabled for RTX 5090")
        
        # Load Mistral model
        model = AutoModelForCausalLM.from_pretrained(
            "${this.config.mistralConfig.baseModel}",
            **model_kwargs
        )
        
        # Enable gradient checkpointing for memory efficiency
        model.gradient_checkpointing_enable()
        logger.info("Gradient checkpointing enabled")
        
        # Prepare model for k-bit training
        model = prepare_model_for_kbit_training(model)
        
        # Configure LoRA for Mistral
        peft_config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            inference_mode=False,
            r=${job.config.training.loraRank},
            lora_alpha=${job.config.training.loraAlpha},
            lora_dropout=0.1,
            target_modules=[
                "q_proj", "k_proj", "v_proj", "o_proj",
                "gate_proj", "up_proj", "down_proj",
            ],
            bias="none",
            use_rslora=True,  # Rank-stabilized LoRA
            init_lora_weights="gaussian"
        )
        
        model = get_peft_model(model, peft_config)
        model.print_trainable_parameters()
        
        return model, tokenizer
    
    def prepare_family_dataset(self, data_path: str, tokenizer):
        """Prepare family legacy dataset with Mistral chat template"""
        
        # Load raw training data
        with open(data_path, 'r') as f:
            raw_data = json.load(f)
        
        # Convert to Mistral chat format
        formatted_data = []
        for item in raw_data:
            if 'messages' in item:
                # Already in chat format
                formatted_data.append(item)
            else:
                # Convert legacy format to Mistral chat format
                messages = [
                    {
                        "role": "system",
                        "content": "You are a wise family member sharing precious memories, life lessons, and personal experiences for future generations. You speak with warmth, authenticity, and the depth that comes from a life well-lived."
                    },
                    {
                        "role": "user", 
                        "content": item.get('instruction', '')
                    },
                    {
                        "role": "assistant",
                        "content": item.get('output', '')
                    }
                ]
                formatted_data.append({"messages": messages})
        
        logger.info(f"Prepared {len(formatted_data)} family legacy examples")
        
        # Create dataset
        dataset = Dataset.from_list(formatted_data)
        
        def tokenize_function(examples):
            """Tokenize using Mistral chat template"""
            texts = []
            for messages in examples['messages']:
                # Apply Mistral chat template
                text = tokenizer.apply_chat_template(
                    messages, 
                    tokenize=False, 
                    add_generation_prompt=False
                )
                texts.append(text)
            
            # Tokenize with proper settings for family legacy training
            return tokenizer(
                texts,
                truncation=True,
                padding=False,
                max_length=${this.config.memoryConfig.maxSequenceLength},
                return_overflowing_tokens=False,
            )
        
        # Tokenize dataset
        tokenized_dataset = dataset.map(
            tokenize_function, 
            batched=True, 
            remove_columns=dataset.column_names,
            num_proc=4
        )
        
        return tokenized_dataset
    
    def create_trainer(self, model, tokenizer, train_dataset, eval_dataset):
        """Create optimized trainer for RTX 5090"""
        
        # Training arguments optimized for RTX 5090 with 32GB VRAM
        training_args = TrainingArguments(
            output_dir=f"/tmp/ai-training/checkpoints/${job.id}",
            overwrite_output_dir=True,
            
            # Training schedule
            num_train_epochs=${job.config.training.epochs},
            per_device_train_batch_size=${job.config.training.batchSize},
            per_device_eval_batch_size=${job.config.training.batchSize},
            gradient_accumulation_steps=8,  # Effective batch size = 8
            
            # Optimization
            learning_rate=${job.config.training.learningRate},
            weight_decay=0.01,
            warmup_steps=${job.config.training.warmupSteps},
            lr_scheduler_type="cosine",
            
            # Memory and performance optimizations
            gradient_checkpointing=True,
            bf16=True,  # Use bf16 for RTX 5090
            tf32=True,
            dataloader_num_workers=8,
            dataloader_pin_memory=True,
            dataloader_persistent_workers=True,
            
            # Monitoring and checkpointing
            logging_steps=5,
            evaluation_strategy="steps",
            eval_steps=50,
            save_steps=100,
            save_total_limit=3,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            
            # RTX 5090 specific optimizations
            ddp_find_unused_parameters=False,
            remove_unused_columns=False,
            report_to=None,
            
            # Advanced optimizations
            optim="adamw_torch_fused",  # Fused AdamW for RTX 5090
            group_by_length=True,
            length_column_name="length",
            max_grad_norm=1.0,
            seed=42,
        )
        
        # Data collator for language modeling
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=tokenizer,
            mlm=False,
            pad_to_multiple_of=8,  # Optimize for tensor cores
        )
        
        # Custom trainer with RTX 5090 metrics
        class RTX5090FamilyTrainer(Trainer):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self.family_trainer = kwargs.pop('family_trainer', None)
            
            def compute_loss(self, model, inputs, return_outputs=False):
                # Memory cleanup every 10 steps
                if self.state.global_step % 10 == 0:
                    torch.cuda.empty_cache()
                
                return super().compute_loss(model, inputs, return_outputs)
            
            def log(self, logs):
                super().log(logs)
                
                # Add RTX 5090 specific metrics
                if torch.cuda.is_available():
                    gpu_memory = torch.cuda.memory_allocated() / 1024**3
                    gpu_cached = torch.cuda.memory_reserved() / 1024**3
                    
                    logs.update({
                        'gpu_memory_allocated_gb': gpu_memory,
                        'gpu_memory_cached_gb': gpu_cached,
                        'gpu_utilization_percent': min(gpu_memory / 32 * 100, 100),
                    })
                
                # Log family-specific training metrics
                if 'loss' in logs and self.family_trainer:
                    self.family_trainer.log_family_metrics(logs)
        
        # Create trainer
        trainer = RTX5090FamilyTrainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            tokenizer=tokenizer,
            data_collator=data_collator,
            family_trainer=self,
        )
        
        return trainer
    
    def log_family_metrics(self, logs):
        """Log family-specific training metrics"""
        
        gpu_stats = {}
        if torch.cuda.is_available():
            gpu_stats = {
                'gpu_memory_allocated': torch.cuda.memory_allocated() / 1024**3,
                'gpu_memory_reserved': torch.cuda.memory_reserved() / 1024**3,
                'gpu_utilization': min(torch.cuda.memory_allocated() / (32 * 1024**3) * 100, 100)
            }
        
        family_metrics = {
            'job_id': self.job_id,
            'timestamp': datetime.now().isoformat(),
            'epoch': logs.get('epoch', 0),
            'step': logs.get('step', 0),
            'loss': logs.get('loss', 0),
            'learning_rate': logs.get('learning_rate', 0),
            'training_time_minutes': (time.time() - self.start_time) / 60,
            'rtx5090_metrics': gpu_stats,
            'model_type': 'mistral-7b-family-legacy',
            'optimization_features': {
                'flash_attention_2': FLASH_ATTENTION_2_AVAILABLE,
                'lora_rank': ${job.config.training.loraRank},
                'lora_alpha': ${job.config.training.loraAlpha},
                'gradient_checkpointing': True,
                'bf16_precision': True
            }
        }
        
        # Write metrics to file
        with open(f'/tmp/ai-training/{self.job_id}_family_metrics.json', 'w') as f:
            json.dump(family_metrics, f, indent=2)
        
        logger.info(f"Family Legacy Training - Epoch: {family_metrics['epoch']:.2f}, "
                   f"Loss: {family_metrics['loss']:.4f}, "
                   f"GPU: {gpu_stats.get('gpu_utilization', 0):.1f}%")

def main():
    """Main family legacy training function"""
    
    job_id = "${job.id}"
    data_path = "${dataPath}"
    
    logger.info(f"Starting RTX 5090 Mistral family legacy training for job: {job_id}")
    
    try:
        # Initialize trainer
        trainer_instance = RTX5090MistralTrainer(job_id)
        
        # Setup model and tokenizer
        model, tokenizer = trainer_instance.setup_model_and_tokenizer()
        
        # Prepare family dataset
        dataset = trainer_instance.prepare_family_dataset(data_path, tokenizer)
        
        # Split dataset
        train_size = int(0.9 * len(dataset))
        train_dataset = dataset.select(range(train_size))
        eval_dataset = dataset.select(range(train_size, len(dataset)))
        
        logger.info(f"Training samples: {len(train_dataset)}, Validation samples: {len(eval_dataset)}")
        
        # Create trainer
        trainer = trainer_instance.create_trainer(model, tokenizer, train_dataset, eval_dataset)
        
        # Model compilation for RTX 5090 (if available)
        try:
            if hasattr(torch, 'compile') and torch.__version__ >= '2.0':
                trainer.model = torch.compile(
                    trainer.model,
                    mode="reduce-overhead",
                    dynamic=True
                )
                logger.info("Model compiled for RTX 5090 optimization")
        except Exception as e:
            logger.warning(f"Model compilation not available: {e}")
        
        # Start training
        logger.info("Starting family legacy training on RTX 5090...")
        
        # Pre-training cleanup
        torch.cuda.empty_cache()
        gc.collect()
        
        # Train the model
        trainer.train()
        
        # Save final model
        final_model_path = f"/tmp/ai-training/models/{job_id}"
        trainer.save_model(final_model_path)
        tokenizer.save_pretrained(final_model_path)
        
        # Final evaluation
        eval_results = trainer.evaluate()
        
        # Save training results
        results = {
            'job_id': job_id,
            'status': 'completed',
            'model_type': 'mistral-7b-family-legacy',
            'final_loss': float(eval_results['eval_loss']),
            'model_path': final_model_path,
            'training_time_minutes': (time.time() - trainer_instance.start_time) / 60,
            'rtx5090_optimizations': {
                'flash_attention_2': FLASH_ATTENTION_2_AVAILABLE,
                'lora_configuration': {
                    'rank': ${job.config.training.loraRank},
                    'alpha': ${job.config.training.loraAlpha}
                },
                'memory_optimizations': True,
                'tensor_core_utilization': True
            },
            'completion_time': datetime.now().isoformat()
        }
        
        with open(f'/tmp/ai-training/{job_id}_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Family legacy training completed successfully!")
        logger.info(f"Final loss: {results['final_loss']:.4f}")
        logger.info(f"Training time: {results['training_time_minutes']:.1f} minutes")
        logger.info(f"Model saved to: {final_model_path}")
        
    except Exception as e:
        logger.error(f"Family legacy training failed: {str(e)}")
        
        # Save error results
        error_results = {
            'job_id': job_id,
            'status': 'failed',
            'error': str(e),
            'model_type': 'mistral-7b-family-legacy',
            'completion_time': datetime.now().isoformat()
        }
        
        with open(f'/tmp/ai-training/{job_id}_results.json', 'w') as f:
            json.dump(error_results, f, indent=2)
        
        sys.exit(1)

if __name__ == "__main__":
    main()
`

    await fs.writeFile(scriptPath, script)
    await fs.chmod(scriptPath, 0o755)
    
    return scriptPath
  }

  /**
   * Start training with RTX 5090 optimizations
   */
  async startTraining(job: TrainingJob, trainingData: TrainingExample[]): Promise<void> {
    try {
      console.log(`Starting RTX 5090 Mistral training for job ${job.id}`)
      
      // Update job status
      await this.updateJobStatus(job.id, 'running')
      
      // Prepare family legacy training data
      const dataPath = await this.prepareFamilyTrainingData(job.id, trainingData)
      
      // Generate optimized training script
      const scriptPath = await this.generateMistralTrainingScript(job, dataPath)
      
      // Start training process
      const trainingProcess = await this.launchTrainingProcess(job, scriptPath)
      
      // Monitor training progress
      this.monitorTraining(job.id, trainingProcess)
      
      this.activeJobs.set(job.id, trainingProcess)

    } catch (error) {
      console.error(`RTX 5090 Mistral training failed for job ${job.id}:`, error)
      await this.handleTrainingFailure(job.id, error)
    }
  }

  /**
   * Prepare family legacy training data with proper formatting
   */
  private async prepareFamilyTrainingData(jobId: string, trainingData: TrainingExample[]): Promise<string> {
    const dataPath = join('/tmp/ai-training', `${jobId}_family_training_data.json`)
    
    // Convert to Mistral chat format for family legacy preservation
    const formattedData = trainingData.map(example => {
      // Create rich family context
      const systemContext = this.buildFamilySystemContext(example.metadata)
      const userQuestion = example.instruction
      const familyResponse = example.output
      
      return {
        messages: [
          {
            role: 'system',
            content: systemContext
          },
          {
            role: 'user',
            content: userQuestion
          },
          {
            role: 'assistant',
            content: familyResponse
          }
        ],
        metadata: {
          userId: example.metadata.userId,
          category: example.metadata.questionCategory,
          wordCount: example.metadata.responseWordCount,
          emotionalTone: example.metadata.emotionalTone,
          timestamp: example.metadata.timestamp
        }
      }
    })

    // Write formatted data
    await fs.writeFile(dataPath, JSON.stringify(formattedData, null, 2))
    
    console.log(`Family legacy training data prepared: ${dataPath} (${trainingData.length} examples)`)
    return dataPath
  }

  /**
   * Build rich family system context for training
   */
  private buildFamilySystemContext(metadata: any): string {
    const contexts = [
      "You are a wise family member sharing precious memories, life lessons, and personal experiences for future generations.",
      "You speak with warmth, authenticity, and the depth that comes from a life well-lived.",
      "Your responses capture not just facts, but the emotions, wisdom, and love that define your family legacy."
    ]

    if (metadata.emotionalTone) {
      switch (metadata.emotionalTone) {
        case 'joyful':
          contexts.push("Share this memory with joy and celebration, letting your happiness shine through.")
          break
        case 'wise':
          contexts.push("Impart this wisdom gently, as someone who has learned important life lessons.")
          break
        case 'nostalgic':
          contexts.push("Share this with the bittersweet beauty of cherished memories.")
          break
        case 'proud':
          contexts.push("Express this with the deep pride of someone who has achieved meaningful things.")
          break
      }
    }

    if (metadata.importantPeople && metadata.importantPeople.length > 0) {
      contexts.push(`When speaking about ${metadata.importantPeople.join(', ')}, show the deep love and connection you share.`)
    }

    return contexts.join(' ')
  }

  /**
   * Launch training process in Docker container
   */
  private async launchTrainingProcess(job: TrainingJob, scriptPath: string): Promise<ChildProcess> {
    // Copy script to Docker container
    const dockerCopyCmd = [
      'cp',
      scriptPath,
      `personal-ai-clone-ml-trainer-1:/workspace/${job.id}_train.py`
    ]
    
    await this.executeCommand('docker', dockerCopyCmd)
    
    // Also copy training data
    const dataPath = `/tmp/ai-training/${job.id}_family_training_data.json`
    const dataCopyCmd = [
      'cp',
      dataPath,
      `personal-ai-clone-ml-trainer-1:/workspace/${job.id}_data.json`
    ]
    
    await this.executeCommand('docker', dataCopyCmd)

    // Launch training in container
    const dockerCommand = [
      'exec',
      '-i',
      'personal-ai-clone-ml-trainer-1',
      'python3',
      `/workspace/${job.id}_train.py`
    ]

    return new Promise((resolve, reject) => {
      const childProcess = spawn('docker', dockerCommand, {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      childProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        console.log(`[${job.id}] ${output}`)
        this.parseAndStoreMetrics(job.id, output)
      })

      childProcess.stderr?.on('data', (data) => {
        const error = data.toString()
        console.error(`[${job.id}] ERROR: ${error}`)
      })

      childProcess.on('error', (error) => {
        console.error(`Docker process error [${job.id}]:`, error)
        reject(error)
      })

      setTimeout(() => resolve(childProcess), 1000)
    })
  }

  /**
   * Execute command with promise
   */
  private executeCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args)
      process.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Command failed with code ${code}`))
      })
      process.on('error', reject)
    })
  }

  /**
   * Monitor training progress
   */
  private monitorTraining(jobId: string, process: ChildProcess) {
    const metricsPath = `/tmp/ai-training/${jobId}_family_metrics.json`
    const resultsPath = `/tmp/ai-training/${jobId}_results.json`
    
    // Monitor metrics
    const metricsInterval = setInterval(async () => {
      try {
        const metricsData = await fs.readFile(metricsPath, 'utf8')
        const metrics = JSON.parse(metricsData)
        
        if (this.metricsCallback) {
          this.metricsCallback(jobId, metrics)
        }
        
      } catch (error) {
        // Metrics file might not exist yet
      }
    }, 5000)

    // Handle process completion
    process.on('exit', async (code) => {
      clearInterval(metricsInterval)
      this.activeJobs.delete(jobId)
      
      try {
        const resultsData = await fs.readFile(resultsPath, 'utf8')
        const results = JSON.parse(resultsData)
        
        if (results.status === 'completed') {
          await this.handleTrainingSuccess(jobId, results)
        } else {
          await this.handleTrainingFailure(jobId, new Error(results.error))
        }
        
      } catch (error) {
        await this.handleTrainingFailure(jobId, error)
      }
    })
  }

  /**
   * Parse and store metrics
   */
  private async parseAndStoreMetrics(jobId: string, output: string): Promise<void> {
    // Look for JSON metrics in output
    const lines = output.split('\n')
    for (const line of lines) {
      if (line.includes('Family Legacy Training -')) {
        // Parse training progress logs
        const epochMatch = line.match(/Epoch: ([\d.]+)/)
        const lossMatch = line.match(/Loss: ([\d.]+)/)
        const gpuMatch = line.match(/GPU: ([\d.]+)%/)
        
        if (epochMatch && lossMatch) {
          const metrics = {
            jobId,
            currentEpoch: parseFloat(epochMatch[1]),
            currentLoss: parseFloat(lossMatch[1]),
            gpuUtilization: gpuMatch ? parseFloat(gpuMatch[1]) : 0,
            timestamp: new Date()
          }
          
          await this.storeTrainingMetrics(metrics)
        }
      }
    }
  }

  /**
   * Store training metrics in database
   */
  private async storeTrainingMetrics(metrics: any): Promise<void> {
    try {
      await query(`
        INSERT INTO training_metrics (
          job_id, epoch, step, loss, learning_rate, gpu_utilization, 
          memory_usage, throughput, estimated_time_remaining, 
          rtx5090_metrics, timestamp, samples_per_second, 
          current_lr, gradient_norm
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (job_id, timestamp) DO UPDATE SET
          epoch = EXCLUDED.epoch,
          step = EXCLUDED.step,
          loss = EXCLUDED.loss,
          gpu_utilization = EXCLUDED.gpu_utilization
      `, [
        metrics.jobId,
        metrics.currentEpoch || 0,
        metrics.currentStep || 0,
        metrics.currentLoss || 0,
        metrics.learningRate || 0,
        metrics.gpuUtilization || 0,
        metrics.memoryUsage || 0,
        metrics.throughputTokensPerSecond || 0,
        metrics.estimatedTimeRemaining || null,
        JSON.stringify(metrics),
        metrics.timestamp,
        metrics.throughputTokensPerSecond || 0,
        metrics.learningRate || 0,
        metrics.gradientNorm || 0
      ])
    } catch (error) {
      console.error('Failed to store training metrics:', error)
    }
  }

  /**
   * Handle successful training completion
   */
  private async handleTrainingSuccess(jobId: string, results: any) {
    try {
      await this.updateJobStatus(jobId, 'completed')
      
      // Create model version record
      const modelVersion = {
        id: crypto.randomUUID(),
        jobId,
        version: await this.getNextModelVersion(results.user_id),
        trainedAt: new Date(),
        baseModel: this.config.mistralConfig.baseModel,
        performance: {
          loss: results.final_loss,
          trainingTime: results.training_time_minutes
        },
        checkpointPath: results.model_path,
        status: 'completed'
      }
      
      await this.saveModelVersion(modelVersion)
      
      console.log(`RTX 5090 Mistral training completed successfully for job: ${jobId}`)
      
    } catch (error) {
      console.error(`Failed to handle training success for job ${jobId}:`, error)
    }
  }

  /**
   * Handle training failure
   */
  private async handleTrainingFailure(jobId: string, error: any) {
    try {
      await this.updateJobStatus(jobId, 'failed')
      
      await query(`
        UPDATE training_runs 
        SET error_message = $1, completed_at = CURRENT_TIMESTAMP 
        WHERE run_id = $2
      `, [error.message, jobId])
      
      console.error(`RTX 5090 Mistral training failed for job ${jobId}:`, error)
      
    } catch (dbError) {
      console.error(`Failed to update failure status for job ${jobId}:`, dbError)
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: string) {
    await query(`
      UPDATE training_runs 
      SET status = $1, 
          ${status === 'running' ? 'started_at = CURRENT_TIMESTAMP,' : ''}
          ${status === 'completed' || status === 'failed' ? 'completed_at = CURRENT_TIMESTAMP,' : ''}
          updated_at = CURRENT_TIMESTAMP
      WHERE run_id = $2
    `.replace(/,\s*updated_at/, ', updated_at'), [status, jobId])
  }

  /**
   * Get next model version
   */
  private async getNextModelVersion(userId: string): Promise<number> {
    const result = await query(`
      SELECT COALESCE(MAX(model_version::int), 0) + 1 as next_version
      FROM training_runs 
      WHERE user_id = $1
    `, [userId])
    
    return result.rows[0]?.next_version || 1
  }

  /**
   * Save model version
   */
  private async saveModelVersion(modelVersion: any) {
    await query(`
      INSERT INTO model_versions (
        id, user_id, version, trained_at, base_model, 
        performance, status, checkpoint_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      modelVersion.id,
      modelVersion.userId,
      modelVersion.version,
      modelVersion.trainedAt,
      modelVersion.baseModel,
      JSON.stringify(modelVersion.performance),
      modelVersion.status,
      modelVersion.checkpointPath
    ])
  }

  /**
   * Set metrics callback
   */
  setMetricsCallback(callback: (jobId: string, metrics: TrainingMetrics) => void) {
    this.metricsCallback = callback
  }

  /**
   * Cancel training job
   */
  async cancelTraining(jobId: string): Promise<void> {
    const process = this.activeJobs.get(jobId)
    if (process) {
      process.kill('SIGTERM')
      this.activeJobs.delete(jobId)
      await this.updateJobStatus(jobId, 'cancelled')
    }
  }
}

// Export singleton instance
export const rtx5090MistralEngine = new RTX5090MistralEngine()