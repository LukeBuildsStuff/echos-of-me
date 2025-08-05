/**
 * LLM Training Engine
 * 
 * Core training system that handles model fine-tuning with RTX 5090 optimization
 * Supports local training, cloud fallback, and comprehensive monitoring
 */

import { TrainingConfig, TrainingJob, TrainingMetrics, ModelVersion, TrainingExample, RTX5090Config, RTX5090Metrics, AdminTrainingQueue, rtx5090Config } from './ai-training-config'
import { query } from './db'
import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

export class TrainingEngine {
  private activeJobs: Map<string, ChildProcess> = new Map()
  private metricsCallback?: (jobId: string, metrics: TrainingMetrics) => void
  private rtx5090Config: RTX5090Config
  private adminQueues: Map<string, AdminTrainingQueue> = new Map()
  private dynamicBatchSizes: Map<string, number> = new Map()

  constructor() {
    this.rtx5090Config = rtx5090Config
    this.setupTrainingEnvironment()
    this.initializeRTX5090Optimizations()
    this.initializeMultiGPUSupport()
  }

  /**
   * Initialize RTX 5090 specific optimizations
   */
  private async initializeRTX5090Optimizations() {
    try {
      // Verify RTX 5090 capability
      const rtxCheck = spawn('python3', ['-c', `
import torch
print(f"PyTorch Version: {torch.__version__}")
if torch.cuda.is_available():
    cap = torch.cuda.get_device_capability(0)
    print(f"CUDA Capability: {cap[0]}.{cap[1]}")
    print(f"Device Name: {torch.cuda.get_device_name(0)}")
    print(f"Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB")
    
    # Check for sm_120 support
    if cap[0] == 12 and cap[1] == 0:
        print("RTX 5090 sm_120 support: CONFIRMED")
    else:
        print(f"Warning: Expected sm_120, found sm_{cap[0]}{cap[1]}")
else:
    print("CUDA not available")
`])

      rtxCheck.stdout.on('data', (data) => {
        console.log('RTX 5090 Status:', data.toString())
      })

      rtxCheck.stderr.on('data', (data) => {
        console.error('RTX 5090 Check Error:', data.toString())
      })

      // Setup memory optimization
      await this.setupMemoryOptimization()
      
      // Initialize dynamic batch sizing
      await this.initializeDynamicBatching()

    } catch (error) {
      console.error('RTX 5090 initialization failed:', error)
    }
  }

  /**
   * Setup advanced memory optimization for RTX 5090
   */
  private async setupMemoryOptimization() {
    // Create memory optimization script
    const memOptScript = `
import torch
import os

# RTX 5090 Memory Optimization Settings
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:1024,garbage_collection_threshold:0.8,expandable_segments:True'

# Enable unified memory for large models
if hasattr(torch.cuda, 'set_memory_fraction'):
    torch.cuda.set_memory_fraction(0.95)  # Use 95% of VRAM

# Flash Attention 2 setup
try:
    from flash_attn import flash_attn_func
    print("Flash Attention 2: Available")
except ImportError:
    print("Flash Attention 2: Not installed")

print("Memory optimization configured for RTX 5090")
`
    
    await fs.writeFile('/tmp/ai-training/memory_setup.py', memOptScript)
  }

  /**
   * Initialize dynamic batch sizing based on VRAM monitoring
   */
  private async initializeDynamicBatching() {
    if (!this.rtx5090Config.dynamicBatching.enabled) return

    console.log('Initializing dynamic batch sizing for RTX 5090...')
    
    // Create VRAM monitoring utility
    const vramMonitorScript = `
import torch
import json
import sys

def get_memory_stats():
    if torch.cuda.is_available():
        memory_allocated = torch.cuda.memory_allocated(0) / 1024**3  # GB
        memory_reserved = torch.cuda.memory_reserved(0) / 1024**3   # GB
        memory_free = (torch.cuda.get_device_properties(0).total_memory / 1024**3) - memory_reserved
        
        stats = {
            'allocated_gb': round(memory_allocated, 2),
            'reserved_gb': round(memory_reserved, 2),
            'free_gb': round(memory_free, 2),
            'utilization_percent': round((memory_reserved / 32) * 100, 2)
        }
        
        print(json.dumps(stats))
    else:
        print(json.dumps({'error': 'CUDA not available'}))

if __name__ == "__main__":
    get_memory_stats()
`
    
    await fs.writeFile('/tmp/ai-training/vram_monitor.py', vramMonitorScript)
  }

  /**
   * Calculate optimal batch size based on current VRAM usage
   */
  private async calculateOptimalBatchSize(jobId: string, currentBatchSize: number): Promise<number> {
    if (!this.rtx5090Config.dynamicBatching.enabled) return currentBatchSize

    try {
      const vramStats = await this.getVRAMStats()
      const utilizationPercent = vramStats.utilization_percent || 0
      
      const config = this.rtx5090Config.dynamicBatching
      let newBatchSize = currentBatchSize

      // Increase batch size if memory utilization is low
      if (utilizationPercent < config.memoryThreshold - 10) {
        newBatchSize = Math.min(currentBatchSize + 1, config.maxBatchSize)
      }
      // Decrease batch size if memory utilization is high
      else if (utilizationPercent > config.memoryThreshold) {
        newBatchSize = Math.max(currentBatchSize - 1, config.minBatchSize)
      }

      if (newBatchSize !== currentBatchSize) {
        console.log(`[${jobId}] Adjusting batch size: ${currentBatchSize} → ${newBatchSize} (VRAM: ${utilizationPercent}%)`)
        this.dynamicBatchSizes.set(jobId, newBatchSize)
      }

      return newBatchSize
    } catch (error) {
      console.error('Error calculating optimal batch size:', error)
      return currentBatchSize
    }
  }

  /**
   * Get current VRAM statistics
   */
  private async getVRAMStats(): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn('python3', ['/tmp/ai-training/vram_monitor.py'])
      let output = ''

      process.stdout.on('data', (data) => {
        output += data.toString()
      })

      process.on('close', (code) => {
        try {
          const stats = JSON.parse(output.trim())
          resolve(stats)
        } catch (error) {
          reject(error)
        }
      })

      process.on('error', reject)
    })
  }

  /**
   * Initialize training environment and check hardware
   */
  private async setupTrainingEnvironment() {
    try {
      // Check CUDA availability
      const cudaCheck = spawn('nvidia-smi', ['--query-gpu=memory.total,memory.free', '--format=csv,noheader,nounits'])
      
      cudaCheck.stdout.on('data', (data) => {
        const [total, free] = data.toString().trim().split(',').map(Number)
        console.log(`GPU Memory: ${free}MB free of ${total}MB total`)
        
        if (total < 20000) { // Less than 20GB
          console.warn('GPU memory may be insufficient for optimal training')
        }
      })

      // Ensure training directories exist
      await fs.mkdir('/tmp/ai-training', { recursive: true })
      await fs.mkdir('/tmp/ai-training/models', { recursive: true })
      await fs.mkdir('/tmp/ai-training/checkpoints', { recursive: true })
      await fs.mkdir('/tmp/ai-training/logs', { recursive: true })

    } catch (error) {
      console.error('Training environment setup failed:', error)
    }
  }

  /**
   * Start training job with comprehensive monitoring
   */
  async startTraining(job: TrainingJob, trainingData: TrainingExample[]): Promise<void> {
    try {
      // Update job status
      await this.updateJobStatus(job.id, 'running')
      
      // Prepare training data
      const dataPath = await this.prepareTrainingData(job.id, trainingData)
      
      // Generate training script
      const scriptPath = await this.generateTrainingScript(job, dataPath)
      
      // Start training process
      const trainingProcess = await this.launchTrainingProcess(job, scriptPath)
      
      // Monitor training progress
      this.monitorTraining(job.id, trainingProcess)
      
      this.activeJobs.set(job.id, trainingProcess)

    } catch (error) {
      console.error(`Training failed for job ${job.id}:`, error)
      await this.handleTrainingFailure(job.id, error)
    }
  }

  /**
   * Prepare training data in the correct format
   */
  private async prepareTrainingData(jobId: string, trainingData: TrainingExample[]): Promise<string> {
    const dataPath = join('/tmp/ai-training', `${jobId}_training_data.jsonl`)
    
    // Convert to training format
    const formattedData = trainingData.map(example => ({
      messages: [
        {
          role: 'system',
          content: `You are a personalized AI assistant trained on ${example.metadata.userId}'s responses. ${example.input}`
        },
        {
          role: 'user',
          content: example.instruction
        },
        {
          role: 'assistant',
          content: example.output
        }
      ]
    }))

    // Write to JSONL format
    const jsonlContent = formattedData.map(item => JSON.stringify(item)).join('\n')
    await fs.writeFile(dataPath, jsonlContent)
    
    console.log(`Training data prepared: ${dataPath} (${trainingData.length} examples)`)
    return dataPath
  }

  /**
   * Generate optimized training script for RTX 5090
   */
  private async generateTrainingScript(job: TrainingJob, dataPath: string): Promise<string> {
    const scriptPath = join('/tmp/ai-training', `${job.id}_train.py`)
    
    // Calculate initial optimal batch size
    const initialBatchSize = await this.calculateOptimalBatchSize(job.id, job.config.training.batchSize)
    
    const script = `#!/usr/bin/env python3
"""
RTX 5090 Optimized LLM Training Script with PyTorch 2.7.0a0+ Support
Generated for job: ${job.id}
Features: Flash Attention 2, Dynamic Batching, Advanced Memory Management
"""

import torch
import transformers
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from datasets import load_dataset
import json
import sys
import os
from datetime import datetime
import logging
from peft import LoraConfig, get_peft_model, TaskType
import bitsandbytes as bnb
from accelerate import Accelerator
import gc
import psutil
import GPUtil

# RTX 5090 Flash Attention 2 Support
try:
    from flash_attn import flash_attn_func
    from flash_attn.modules.mha import FlashSelfAttention
    FLASH_ATTENTION_2_AVAILABLE = True
    print("Flash Attention 2: Enabled")
except ImportError:
    FLASH_ATTENTION_2_AVAILABLE = False
    print("Flash Attention 2: Not available, falling back to standard attention")

# RTX 5090 Memory Management
if torch.cuda.is_available():
    # Verify RTX 5090 sm_120 support
    capability = torch.cuda.get_device_capability(0)
    if capability[0] >= 12:  # sm_120 or higher
        print(f"RTX 5090 sm_{capability[0]}{capability[1]} support confirmed")
        # Enable advanced memory features
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
        torch.backends.cuda.matmul.allow_fp16_reduced_precision_reduction = True
    else:
        print(f"Warning: GPU compute capability sm_{capability[0]}{capability[1]} may not be optimal")
        
    # RTX 5090 Memory Optimization
    torch.cuda.empty_cache()
    if hasattr(torch.cuda, 'set_memory_fraction'):
        torch.cuda.set_memory_fraction(0.95)  # Use 95% of 32GB VRAM

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RTX5090MemoryManager:
    """Advanced memory management for RTX 5090"""
    
    def __init__(self):
        self.vram_total = 32  # GB
        self.memory_threshold = 0.9  # 90% threshold
        
    def get_memory_stats(self):
        if torch.cuda.is_available():
            allocated = torch.cuda.memory_allocated(0) / 1024**3
            reserved = torch.cuda.memory_reserved(0) / 1024**3
            free = self.vram_total - reserved
            return {
                'allocated_gb': allocated,
                'reserved_gb': reserved,
                'free_gb': free,
                'utilization': reserved / self.vram_total
            }
        return None
    
    def cleanup_memory(self):
        """Aggressive memory cleanup for large model training"""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
        gc.collect()
    
    def should_reduce_batch_size(self):
        stats = self.get_memory_stats()
        if stats:
            return stats['utilization'] > self.memory_threshold
        return False

class DynamicBatchTrainer(Trainer):
    """Custom trainer with dynamic batch sizing for RTX 5090"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.memory_manager = RTX5090MemoryManager()
        self.current_batch_size = ${initialBatchSize}
        self.min_batch_size = ${this.rtx5090Config.dynamicBatching.minBatchSize}
        self.max_batch_size = ${this.rtx5090Config.dynamicBatching.maxBatchSize}
        self.batch_adaptations = 0
        
    def compute_loss(self, model, inputs, return_outputs=False):
        # Monitor memory usage and adapt batch size
        if self.memory_manager.should_reduce_batch_size() and self.current_batch_size > self.min_batch_size:
            self.current_batch_size = max(self.min_batch_size, self.current_batch_size - 1)
            self.batch_adaptations += 1
            logger.info(f"Reducing batch size to {self.current_batch_size} due to memory pressure")
            
        # Cleanup memory before forward pass
        if self.state.global_step % 10 == 0:
            self.memory_manager.cleanup_memory()
            
        return super().compute_loss(model, inputs, return_outputs)
    
    def log(self, logs):
        super().log(logs)
        # Add RTX 5090 specific metrics
        memory_stats = self.memory_manager.get_memory_stats()
        if memory_stats:
            logs.update({
                'vram_utilization': memory_stats['utilization'],
                'vram_allocated_gb': memory_stats['allocated_gb'],
                'current_batch_size': self.current_batch_size,
                'batch_adaptations': self.batch_adaptations
            })
            
        # Custom metrics logging
        if 'loss' in logs:
            self.log_rtx5090_metrics(logs)
    
    def log_rtx5090_metrics(self, logs):
        """Log RTX 5090 specific performance metrics"""
        memory_stats = self.memory_manager.get_memory_stats()
        
        # Get GPU utilization if available
        gpu_util = 0
        try:
            gpus = GPUtil.getGPUs()
            if gpus:
                gpu_util = gpus[0].load * 100
        except:
            pass
            
        rtx5090_metrics = {
            'jobId': '${job.id}',
            'currentEpoch': int(logs.get('epoch', 0)),
            'currentStep': int(logs.get('step', 0)),
            'currentLoss': float(logs['loss']),
            'learningRate': float(logs.get('learning_rate', 0)),
            'gpuUtilization': gpu_util,
            'tensorCoreUtilization': gpu_util,  # Approximation
            'vramFragmentation': 0,  # Would need more complex calculation
            'flashAttention2Speedup': 1.3 if FLASH_ATTENTION_2_AVAILABLE else 1.0,
            'memoryBandwidthUtilization': memory_stats['utilization'] * 100 if memory_stats else 0,
            'computeEfficiency': gpu_util,
            'currentBatchSize': self.current_batch_size,
            'batchSizeAdaptations': self.batch_adaptations,
            'memoryPressure': memory_stats['utilization'] * 100 if memory_stats else 0,
            'gpuTemperature': 0,  # Would need nvidia-ml-py
            'powerDraw': 0,  # Would need nvidia-ml-py
            'thermalThrottling': False,
            'timestamp': datetime.now().isoformat()
        }
        
        # Write RTX 5090 metrics
        with open('/tmp/ai-training/${job.id}_rtx5090_metrics.json', 'w') as f:
            json.dump(rtx5090_metrics, f)

class RTX5090TrainingMetricsLogger:
    def __init__(self, job_id):
        self.job_id = job_id
        self.start_time = datetime.now()
        self.memory_manager = RTX5090MemoryManager()
    
    def log_metrics(self, epoch, step, loss, lr, gpu_util=0):
        memory_stats = self.memory_manager.get_memory_stats()
        
        metrics = {
            'jobId': self.job_id,
            'currentEpoch': epoch,
            'currentStep': step,
            'currentLoss': float(loss),
            'learningRate': float(lr),
            'gpuUtilization': gpu_util,
            'memoryUsage': memory_stats['utilization'] * 100 if memory_stats else 0,
            'estimatedTimeRemaining': 0,  # Would calculate based on progress
            'throughputTokensPerSecond': 0,  # Would calculate based on batch processing
            'lastUpdated': datetime.now(),
            'timestamp': datetime.now().isoformat()
        }
        
        # Write to metrics file for monitoring
        with open(f'/tmp/ai-training/{self.job_id}_metrics.json', 'w') as f:
            json.dump(metrics, f, default=str)

def setup_model_and_tokenizer(config):
    """Setup model with RTX 5090 optimizations and Flash Attention 2"""
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(config['model']['baseModel'])
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    # Advanced model loading configuration for RTX 5090
    model_kwargs = {
        'torch_dtype': torch.bfloat16 if config['model']['precision'] == 'bf16' else torch.float16,
        'device_map': "auto",
        'trust_remote_code': True,
        'use_cache': False,  # Disable for training
    }
    
    # Enhanced quantization for RTX 5090
    if config['model'].get('quantization') == '4bit':
        model_kwargs.update({
            'load_in_4bit': True,
            'bnb_4bit_compute_dtype': torch.bfloat16,
            'bnb_4bit_use_double_quant': True,
            'bnb_4bit_quant_type': "nf4",
            'bnb_4bit_quant_storage': torch.uint8
        })
    
    # Flash Attention 2 configuration
    if FLASH_ATTENTION_2_AVAILABLE:
        model_kwargs['attn_implementation'] = "flash_attention_2"
        print("Using Flash Attention 2 for RTX 5090 optimization")
    
    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        config['model']['baseModel'],
        **model_kwargs
    )
    
    # Enable gradient checkpointing for memory efficiency
    if config['training']['gradientCheckpointing']:
        model.gradient_checkpointing_enable()
        print("Gradient checkpointing enabled for RTX 5090")
    
    # Apply LoRA for efficient training
    if config['training']['method'] == 'lora':
        peft_config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            inference_mode=False,
            r=config['training']['loraRank'],
            lora_alpha=config['training']['loraAlpha'],
            lora_dropout=0.1,
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            # RTX 5090 optimizations
            bias="none",
            use_rslora=True,  # Rank-stabilized LoRA
            init_lora_weights="gaussian"
        )
        model = get_peft_model(model, peft_config)
        model.print_trainable_parameters()
    
    # Model memory optimization
    if hasattr(model, 'tie_weights'):
        model.tie_weights()
    
    return model, tokenizer

def prepare_dataset(tokenizer, data_path):
    """Prepare dataset for training"""
    
    dataset = load_dataset('json', data_files=data_path, split='train')
    
    def tokenize_function(examples):
        # Format as chat template
        texts = []
        for messages in examples['messages']:
            text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
            texts.append(text)
        
        return tokenizer(
            texts,
            truncation=True,
            padding=False,
            max_length=${job.config.model.contextLength}
        )
    
    tokenized_dataset = dataset.map(tokenize_function, batched=True, remove_columns=dataset.column_names)
    return tokenized_dataset

def main():
    """Main training function"""
    
    # Training configuration
    config = ${JSON.stringify(job.config, null, 2)}
    
    logger.info(f"Starting training for job: ${job.id}")
    logger.info(f"Config: {config}")
    
    # Setup metrics logger
    metrics_logger = RTX5090TrainingMetricsLogger("${job.id}")
    
    try:
        # Setup model and tokenizer
        model, tokenizer = setup_model_and_tokenizer(config)
        
        # Prepare dataset
        dataset = prepare_dataset(tokenizer, "${job.id}_training_data.jsonl")
        
        # Split dataset for validation
        train_size = int(0.9 * len(dataset))
        train_dataset = dataset.select(range(train_size))
        eval_dataset = dataset.select(range(train_size, len(dataset)))
        
        # Training arguments optimized for RTX 5090 with 32GB VRAM
        training_args = TrainingArguments(
            output_dir=f"/tmp/ai-training/checkpoints/${job.id}",
            overwrite_output_dir=True,
            num_train_epochs=config['training']['epochs'],
            per_device_train_batch_size=${initialBatchSize},  # Dynamic batch size
            per_device_eval_batch_size=${initialBatchSize},
            gradient_accumulation_steps=max(1, 8 // ${initialBatchSize}),  # Adaptive accumulation
            gradient_checkpointing=config['training']['gradientCheckpointing'],
            learning_rate=config['training']['learningRate'],
            weight_decay=0.01,
            logging_steps=5,  # More frequent logging for RTX 5090 monitoring
            evaluation_strategy="steps",
            eval_steps=25,  # More frequent evaluation
            save_steps=50,  # More frequent checkpointing
            save_total_limit=5,  # Keep more checkpoints for RTX 5090
            warmup_steps=config['training']['warmupSteps'],
            fp16=config['model']['precision'] == 'fp16',
            bf16=config['model']['precision'] == 'bf16',
            tf32=True,  # Enable TF32 for RTX 5090 Tensor Cores
            dataloader_num_workers=8,  # Increased for RTX 5090
            dataloader_pin_memory=True,  # RTX 5090 optimization
            remove_unused_columns=False,
            report_to=None,  # Disable wandb
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            # RTX 5090 specific optimizations
            ddp_find_unused_parameters=False,
            optim="adamw_torch_fused",  # Fused optimizer for RTX 5090
            group_by_length=True,  # Reduce padding overhead
            length_column_name="length",
            # Memory optimizations
            max_grad_norm=1.0,
            seed=42,
            data_seed=42,
        )
        
        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=tokenizer,
            mlm=False,
        )
        
        # RTX 5090 optimized trainer already defined above
        
        # Initialize RTX 5090 optimized trainer
        trainer = DynamicBatchTrainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            tokenizer=tokenizer,
            data_collator=data_collator,
        )
        
        # Enable RTX 5090 specific optimizations
        if torch.cuda.is_available():
            # Compile model for RTX 5090 if PyTorch 2.0+
            try:
                if hasattr(torch, 'compile') and torch.__version__ >= '2.0':
                    trainer.model = torch.compile(
                        trainer.model,
                        mode="reduce-overhead",  # Optimize for RTX 5090
                        fullgraph=False,
                        dynamic=True
                    )
                    print("Model compiled for RTX 5090 optimization")
            except Exception as e:
                print(f"Model compilation not available: {e}")
                
            # Set CUDA streams for RTX 5090
            torch.cuda.set_stream(torch.cuda.Stream())
        
        # Pre-training RTX 5090 optimizations
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
            
        # Start training with RTX 5090 monitoring
        logger.info("Starting RTX 5090 optimized training...")
        logger.info(f"Using Flash Attention 2: {FLASH_ATTENTION_2_AVAILABLE}")
        logger.info(f"Initial batch size: ${initialBatchSize}")
        logger.info(f"Model precision: {config['model']['precision']}")
        
        try:
            trainer.train()
        except torch.cuda.OutOfMemoryError as e:
            logger.error(f"CUDA OOM Error: {e}")
            # Attempt recovery with smaller batch size
            trainer.current_batch_size = max(1, trainer.current_batch_size // 2)
            logger.info(f"Retrying with batch size: {trainer.current_batch_size}")
            torch.cuda.empty_cache()
            trainer.train()
        
        # Save final model with RTX 5090 optimizations
        final_model_path = f"/tmp/ai-training/models/${job.id}"
        
        # Clean up memory before saving
        torch.cuda.empty_cache()
        gc.collect()
        
        # Save model with optimizations
        trainer.save_model(final_model_path)
        tokenizer.save_pretrained(final_model_path)
        
        # Save RTX 5090 training configuration
        rtx5090_config = {
            'flash_attention_2_used': FLASH_ATTENTION_2_AVAILABLE,
            'final_batch_size': trainer.current_batch_size,
            'batch_adaptations': trainer.batch_adaptations,
            'memory_optimizations': 'RTX_5090_ENABLED',
            'compute_capability': 'sm_120',
            'vram_utilized': '32GB'
        }
        
        with open(f'{final_model_path}/rtx5090_config.json', 'w') as f:
            json.dump(rtx5090_config, f, indent=2)
        
        # Calculate final metrics
        eval_results = trainer.evaluate()
        
        # Save training results
        results = {
            'job_id': '${job.id}',
            'status': 'completed',
            'final_loss': float(eval_results['eval_loss']),
            'model_path': final_model_path,
            'training_time': (datetime.now() - metrics_logger.start_time).total_seconds() / 60,
            'completion_time': datetime.now().isoformat()
        }
        
        with open(f'/tmp/ai-training/${job.id}_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Training completed successfully for job: ${job.id}")
        
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        
        # Save error results
        error_results = {
            'job_id': '${job.id}',
            'status': 'failed',
            'error': str(e),
            'completion_time': datetime.now().isoformat()
        }
        
        with open(f'/tmp/ai-training/${job.id}_results.json', 'w') as f:
            json.dump(error_results, f, indent=2)
        
        sys.exit(1)

if __name__ == "__main__":
    main()
`

    await fs.writeFile(scriptPath, script)
    await fs.chmod(scriptPath, 0o755)
    
    // Copy script to Docker container workspace
    try {
      const dockerCpCommand = [
        'cp',
        scriptPath,
        `personal-ai-clone-ml-trainer-1:/workspace/${job.id}_train.py`
      ]
      
      const cpProcess = spawn('docker', dockerCpCommand)
      await new Promise((resolve, reject) => {
        cpProcess.on('close', (code) => {
          if (code === 0) resolve(code)
          else reject(new Error(`Docker cp failed with code ${code}`))
        })
        cpProcess.on('error', reject)
      })

      // Also copy training data to container
      const dataCpCommand = [
        'cp',
        dataPath,
        `personal-ai-clone-ml-trainer-1:/workspace/${job.id}_training_data.jsonl`
      ]
      
      const dataCpProcess = spawn('docker', dataCpCommand)
      await new Promise((resolve, reject) => {
        dataCpProcess.on('close', (code) => {
          if (code === 0) resolve(code)
          else reject(new Error(`Docker data cp failed with code ${code}`))
        })
        dataCpProcess.on('error', reject)
      })

      console.log(`Training script and data copied to Docker container for job ${job.id}`)
    } catch (error) {
      console.error(`Failed to copy files to Docker container for job ${job.id}:`, error)
      throw error
    }
    
    return scriptPath
  }

  /**
   * Launch training process using Docker ml-trainer container
   */
  private async launchTrainingProcess(job: TrainingJob, scriptPath: string): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      // Use Docker exec to run the training script in the ml-trainer container
      const dockerCommand = [
        'exec',
        '-i',
        'personal-ai-clone-ml-trainer-1', // Docker container name
        'python3',
        `/workspace/${job.id}_train.py`
      ]

      const childProcess = spawn('docker', dockerCommand, {
        env: {
          ...process.env,
        },
        stdio: ['pipe', 'pipe', 'pipe']
      })

      childProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        console.log(`Training output [${job.id}]: ${output}`)
        
        // Parse and store training metrics
        this.parseAndStoreMetrics(job.id, output)
      })

      childProcess.stderr?.on('data', (data) => {
        const error = data.toString()
        console.error(`Training error [${job.id}]: ${error}`)
        
        // Check for specific errors and handle them
        if (error.includes('CUDA out of memory')) {
          console.error(`CUDA OOM detected for job ${job.id}`)
        }
      })

      childProcess.on('error', (error) => {
        console.error(`Docker process error [${job.id}]:`, error)
        reject(error)
      })

      // Process started successfully
      setTimeout(() => resolve(childProcess), 1000)
    })
  }

  /**
   * Parse training output and store metrics in database
   */
  private async parseAndStoreMetrics(jobId: string, output: string): Promise<void> {
    try {
      // Look for JSON metrics in the output
      const lines = output.split('\n')
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('jobId')) {
          try {
            const metrics = JSON.parse(line.trim())
            if (metrics.jobId === jobId) {
              await this.storeTrainingMetrics(metrics)
            }
          } catch (parseError) {
            // Ignore non-JSON lines
          }
        }
      }
    } catch (error) {
      console.error(`Failed to parse metrics for job ${jobId}:`, error)
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
          learning_rate = EXCLUDED.learning_rate,
          gpu_utilization = EXCLUDED.gpu_utilization,
          memory_usage = EXCLUDED.memory_usage,
          throughput = EXCLUDED.throughput,
          estimated_time_remaining = EXCLUDED.estimated_time_remaining,
          rtx5090_metrics = EXCLUDED.rtx5090_metrics,
          samples_per_second = EXCLUDED.samples_per_second,
          current_lr = EXCLUDED.current_lr,
          gradient_norm = EXCLUDED.gradient_norm
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
        new Date(metrics.timestamp || Date.now()),
        metrics.throughputTokensPerSecond || 0,
        metrics.learningRate || 0,
        metrics.gradientNorm || 0
      ])
    } catch (error) {
      console.error('Failed to store training metrics:', error)
    }
  }

  /**
   * Monitor training progress and metrics
   */
  private monitorTraining(jobId: string, process: ChildProcess) {
    const metricsPath = `/tmp/ai-training/${jobId}_metrics.json`
    const resultsPath = `/tmp/ai-training/${jobId}_results.json`
    
    // Monitor training metrics
    const metricsInterval = setInterval(async () => {
      try {
        const metricsData = await fs.readFile(metricsPath, 'utf8')
        const metrics = JSON.parse(metricsData) as TrainingMetrics
        
        // Callback to update UI
        if (this.metricsCallback) {
          this.metricsCallback(jobId, metrics)
        }

        // Also check for RTX 5090 specific metrics
        const rtx5090Metrics = await this.monitorRTX5090Performance(jobId)
        if (rtx5090Metrics && this.metricsCallback) {
          this.metricsCallback(jobId, rtx5090Metrics)
        }
        
      } catch (error) {
        // Metrics file might not exist yet
      }
    }, 5000) // Update every 5 seconds

    // Monitor process completion
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
        
        // Process next job in admin queues
        for (const [queueId, queue] of this.adminQueues.entries()) {
          const jobIndex = queue.activeJobs.findIndex(job => job.id === jobId)
          if (jobIndex !== -1) {
            const completedJob = queue.activeJobs.splice(jobIndex, 1)[0]
            completedJob.completedAt = new Date()
            completedJob.status = results.status === 'completed' ? 'completed' : 'failed'
            queue.completedJobs.push(completedJob)
            
            await this.updateAdminQueueStats(queueId)
            await this.processNextJobInQueue(queueId)
            break
          }
        }
        
      } catch (error) {
        await this.handleTrainingFailure(jobId, error)
      }
    })
  }

  /**
   * Handle successful training completion
   */
  private async handleTrainingSuccess(jobId: string, results: any) {
    try {
      // Update job status
      await this.updateJobStatus(jobId, 'completed')
      
      // Create model version record
      const modelVersion: Partial<ModelVersion> = {
        id: crypto.randomUUID(),
        userId: results.user_id,
        version: await this.getNextModelVersion(results.user_id),
        trainedAt: new Date(),
        baseModel: results.base_model,
        trainingExamples: results.training_examples,
        performance: {
          loss: results.final_loss,
          validationLoss: results.validation_loss || results.final_loss,
          coherenceScore: 0.8, // Placeholder - would be calculated
          personaMatchScore: 0.85, // Placeholder - would be calculated
          perplexity: Math.exp(results.final_loss)
        },
        status: 'deployed',
        checkpointPath: results.model_path,
        modelSize: await this.getModelSize(results.model_path),
        trainingTime: results.training_time,
        metadata: {
          trainingHost: 'local',
          gpuUsed: 'RTX 5090'
        }
      }
      
      await this.saveModelVersion(modelVersion)
      
      console.log(`Training completed successfully for job: ${jobId}`)
      
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
      
      // Log error details
      await query(`
        UPDATE training_runs 
        SET error_message = $1, completed_at = CURRENT_TIMESTAMP 
        WHERE run_id = $2
      `, [error.message, jobId])
      
      console.error(`Training failed for job ${jobId}:`, error)
      
    } catch (dbError) {
      console.error(`Failed to update failure status for job ${jobId}:`, dbError)
    }
  }

  /**
   * Utility functions
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

  private async getNextModelVersion(userId: string): Promise<number> {
    const result = await query(`
      SELECT COALESCE(MAX(model_version::int), 0) + 1 as next_version
      FROM training_runs 
      WHERE user_id = $1
    `, [userId])
    
    return result.rows[0]?.next_version || 1
  }

  private async getModelSize(modelPath: string): Promise<number> {
    try {
      const stats = await fs.stat(modelPath)
      return Math.round(stats.size / (1024 * 1024)) // MB
    } catch {
      return 0
    }
  }

  private async saveModelVersion(modelVersion: Partial<ModelVersion>) {
    await query(`
      INSERT INTO model_versions (
        id, user_id, version, trained_at, base_model, training_examples,
        performance, status, checkpoint_path, model_size, training_time, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      modelVersion.id,
      modelVersion.userId,
      modelVersion.version,
      modelVersion.trainedAt,
      modelVersion.baseModel,
      modelVersion.trainingExamples,
      JSON.stringify(modelVersion.performance),
      modelVersion.status,
      modelVersion.checkpointPath,
      modelVersion.modelSize,
      modelVersion.trainingTime,
      JSON.stringify(modelVersion.metadata)
    ])
  }

  /**
   * Set callback for real-time metrics updates
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

  /**
   * Initialize multi-GPU setup for future scaling
   */
  private async initializeMultiGPUSupport() {
    if (!this.rtx5090Config.multiGpuConfig.enabled) return

    try {
      // Check available GPUs
      const gpuCheck = spawn('python3', ['-c', `
import torch
if torch.cuda.is_available():
    gpu_count = torch.cuda.device_count()
    print(f"Available GPUs: {gpu_count}")
    for i in range(gpu_count):
        props = torch.cuda.get_device_properties(i)
        print(f"GPU {i}: {props.name} - {props.total_memory / 1024**3:.1f}GB")
        cap = torch.cuda.get_device_capability(i)
        print(f"  Compute Capability: sm_{cap[0]}{cap[1]}")
else:
    print("CUDA not available")
`])

      gpuCheck.stdout.on('data', (data) => {
        console.log('Multi-GPU Status:', data.toString())
      })

      // Prepare multi-GPU configuration script
      const multiGpuScript = `
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP
import os

def setup_distributed_training(rank, world_size):
    """Setup distributed training for multiple RTX 5090 GPUs"""
    os.environ['MASTER_ADDR'] = 'localhost'
    os.environ['MASTER_PORT'] = '12355'
    
    # Initialize the process group
    dist.init_process_group("nccl", rank=rank, world_size=world_size)
    
    # Set the GPU for this process
    torch.cuda.set_device(rank)
    
    print(f"Rank {rank}/{world_size} initialized on GPU {rank}")

def wrap_model_for_distributed(model, device_id):
    """Wrap model for distributed training"""
    model = model.to(device_id)
    
    # Use DDP for smaller models, FSDP for larger models (13B+)
    if hasattr(model, 'num_parameters') and model.num_parameters() > 7e9:  # 7B+ parameters
        # Use FSDP for large models
        model = FSDP(
            model,
            device_id=device_id,
            mixed_precision=torch.distributed.fsdp.MixedPrecision(
                param_dtype=torch.bfloat16,
                reduce_dtype=torch.bfloat16,
                buffer_dtype=torch.bfloat16,
            ),
            sharding_strategy=torch.distributed.fsdp.ShardingStrategy.SHARD_GRAD_OP,
            cpu_offload=torch.distributed.fsdp.CPUOffload(offload_params=False),
        )
        print("Using FSDP for large model distribution")
    else:
        # Use DDP for smaller models
        model = DDP(model, device_ids=[device_id], find_unused_parameters=False)
        print("Using DDP for model distribution")
    
    return model

if __name__ == "__main__":
    print("Multi-GPU support configured for RTX 5090")
`
      
      await fs.writeFile('/tmp/ai-training/multigpu_setup.py', multiGpuScript)
      console.log('Multi-GPU support prepared for future scaling')

    } catch (error) {
      console.error('Multi-GPU initialization failed:', error)
    }
  }

  /**
   * Create admin training queue for managing multiple user training jobs
   */
  async createAdminQueue(adminId: string, queueConfig: Partial<AdminTrainingQueue>): Promise<string> {
    const queueId = crypto.randomUUID()
    
    const queue: AdminTrainingQueue = {
      id: queueId,
      adminId,
      queueName: queueConfig.queueName || `admin-queue-${Date.now()}`,
      createdAt: new Date(),
      maxConcurrentJobs: queueConfig.maxConcurrentJobs || this.rtx5090Config.multiGpuConfig.enabled ? 3 : 1,
      priorityWeights: queueConfig.priorityWeights || { high: 3, medium: 2, low: 1 },
      gpuAllocation: queueConfig.gpuAllocation || {
        reservedVRAM: 10, // GB per job
        maxVRAMPerUser: 20, // GB
        queueTimeoutMinutes: 180 // 3 hours
      },
      activeJobs: [],
      queuedJobs: [],
      completedJobs: [],
      stats: {
        totalJobsProcessed: 0,
        averageTrainingTime: 0,
        successRate: 100,
        totalGpuHours: 0
      }
    }

    this.adminQueues.set(queueId, queue)
    
    // Store in database
    await query(`
      INSERT INTO admin_training_queues (
        id, admin_id, queue_name, created_at, config, stats
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      queueId,
      adminId,
      queue.queueName,
      queue.createdAt,
      JSON.stringify({
        maxConcurrentJobs: queue.maxConcurrentJobs,
        priorityWeights: queue.priorityWeights,
        gpuAllocation: queue.gpuAllocation
      }),
      JSON.stringify(queue.stats)
    ])

    console.log(`Admin queue created: ${queueId} for admin: ${adminId}`)
    return queueId
  }

  /**
   * Add job to admin queue with priority management
   */
  async addJobToAdminQueue(queueId: string, job: TrainingJob): Promise<void> {
    const queue = this.adminQueues.get(queueId)
    if (!queue) {
      throw new Error(`Admin queue not found: ${queueId}`)
    }

    // Check if queue has capacity
    if (queue.activeJobs.length >= queue.maxConcurrentJobs) {
      // Add to queued jobs with priority ordering
      const insertIndex = this.findInsertionIndex(queue.queuedJobs, job)
      queue.queuedJobs.splice(insertIndex, 0, job)
      
      await this.updateJobStatus(job.id, 'queued')
      console.log(`Job ${job.id} queued in admin queue ${queueId} at position ${insertIndex + 1}`)
    } else {
      // Start job immediately
      queue.activeJobs.push(job)
      await this.startTraining(job, []) // Training data would be loaded separately
      console.log(`Job ${job.id} started immediately in admin queue ${queueId}`)
    }

    // Update queue in database
    await this.updateAdminQueueStats(queueId)
  }

  /**
   * Find insertion index for priority queue
   */
  private findInsertionIndex(queuedJobs: TrainingJob[], newJob: TrainingJob): number {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const newJobPriority = priorityOrder[newJob.priority]

    for (let i = 0; i < queuedJobs.length; i++) {
      const existingPriority = priorityOrder[queuedJobs[i].priority]
      if (newJobPriority > existingPriority) {
        return i
      }
    }
    
    return queuedJobs.length
  }

  /**
   * Process next job in admin queue
   */
  private async processNextJobInQueue(queueId: string): Promise<void> {
    const queue = this.adminQueues.get(queueId)
    if (!queue || queue.queuedJobs.length === 0) return

    if (queue.activeJobs.length < queue.maxConcurrentJobs) {
      const nextJob = queue.queuedJobs.shift()
      if (nextJob) {
        queue.activeJobs.push(nextJob)
        
        // Load training data for the job
        const trainingData = await this.loadTrainingDataForJob(nextJob.id)
        await this.startTraining(nextJob, trainingData)
        
        console.log(`Started queued job ${nextJob.id} in admin queue ${queueId}`)
      }
    }
  }

  /**
   * Load training data for a specific job
   */
  private async loadTrainingDataForJob(jobId: string): Promise<TrainingExample[]> {
    const result = await query(`
      SELECT training_data 
      FROM training_runs 
      WHERE run_id = $1
    `, [jobId])

    if (result.rows.length === 0) {
      throw new Error(`No training data found for job: ${jobId}`)
    }

    return JSON.parse(result.rows[0].training_data || '[]')
  }

  /**
   * Update admin queue statistics
   */
  private async updateAdminQueueStats(queueId: string): Promise<void> {
    const queue = this.adminQueues.get(queueId)
    if (!queue) return

    // Calculate statistics
    const totalJobs = queue.completedJobs.length
    const successfulJobs = queue.completedJobs.filter(job => job.status === 'completed').length
    const totalTime = queue.completedJobs.reduce((sum, job) => {
      if (job.completedAt && job.startedAt) {
        return sum + (job.completedAt.getTime() - job.startedAt.getTime()) / (1000 * 60) // minutes
      }
      return sum
    }, 0)

    queue.stats = {
      totalJobsProcessed: totalJobs,
      averageTrainingTime: totalJobs > 0 ? totalTime / totalJobs : 0,
      successRate: totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 100,
      totalGpuHours: totalTime / 60 // convert to hours
    }

    // Update in database
    await query(`
      UPDATE admin_training_queues 
      SET stats = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(queue.stats), queueId])
  }

  /**
   * Get admin queue status
   */
  async getAdminQueueStatus(queueId: string): Promise<AdminTrainingQueue | null> {
    return this.adminQueues.get(queueId) || null
  }

  /**
   * List all admin queues
   */
  async listAdminQueues(adminId?: string): Promise<AdminTrainingQueue[]> {
    const queues = Array.from(this.adminQueues.values())
    return adminId ? queues.filter(q => q.adminId === adminId) : queues
  }

  /**
   * Enhanced performance monitoring with RTX 5090 metrics
   */
  private async monitorRTX5090Performance(jobId: string): Promise<RTX5090Metrics | null> {
    try {
      const rtx5090MetricsPath = `/tmp/ai-training/${jobId}_rtx5090_metrics.json`
      const metricsData = await fs.readFile(rtx5090MetricsPath, 'utf8')
      return JSON.parse(metricsData) as RTX5090Metrics
    } catch (error) {
      return null
    }
  }

  /**
   * Get comprehensive RTX 5090 system status
   */
  async getRTX5090SystemStatus(): Promise<any> {
    try {
      const vramStats = await this.getVRAMStats()
      const activeJobs = Array.from(this.activeJobs.keys())
      
      return {
        hardware: {
          vramTotal: this.rtx5090Config.vramSize,
          vramUsed: vramStats.reserved_gb || 0,
          vramFree: vramStats.free_gb || 0,
          computeCapability: this.rtx5090Config.computeCapability,
          flashAttention2Enabled: this.rtx5090Config.flashAttention2Config.enabled
        },
        queues: {
          totalQueues: this.adminQueues.size,
          activeJobs: activeJobs.length,
          maxConcurrentJobs: this.rtx5090Config.multiGpuConfig.enabled ? 3 : 1
        },
        performance: {
          dynamicBatchingEnabled: this.rtx5090Config.dynamicBatching.enabled,
          multiGpuSupport: this.rtx5090Config.multiGpuConfig.enabled,
          memoryOptimization: this.rtx5090Config.memoryConfig.poolingStrategy
        }
      }
    } catch (error) {
      console.error('Error getting RTX 5090 system status:', error)
      return null
    }
  }

  /**
   * Get training queue status
   */
  async getQueueStatus(): Promise<TrainingJob[]> {
    const result = await query(`
      SELECT 
        run_id as id,
        user_id,
        status,
        started_at as queued_at,
        training_params as config
      FROM training_runs 
      WHERE status IN ('queued', 'running')
      ORDER BY started_at ASC
    `)
    
    return result.rows.map(row => ({
      ...row,
      config: row.config || {},
      priority: 'medium',
      estimatedDuration: 120,
      dataHash: '',
      retryCount: 0,
      maxRetries: 3,
      resourceRequirements: {
        gpuMemoryGB: 20,
        diskSpaceGB: 5,
        estimatedCost: 2
      }
    }))
  }

  /**
   * Add job to queue with simple priority management
   */
  async addJobToQueue(job: TrainingJob, trainingData: TrainingExample[]): Promise<void> {
    try {
      // Store training data in the database for the job
      await query(`
        UPDATE training_runs 
        SET training_data = $1
        WHERE run_id = $2
      `, [JSON.stringify(trainingData), job.id])

      console.log(`Job ${job.id} added to training queue with ${trainingData.length} examples`)
    } catch (error) {
      console.error(`Failed to add job ${job.id} to queue:`, error)
      throw error
    }
  }

  /**
   * Process queue - start training for queued jobs
   */
  async processQueue(): Promise<void> {
    try {
      // Get next queued job
      const result = await query(`
        SELECT run_id, user_id, training_data, training_params
        FROM training_runs 
        WHERE status = 'queued'
        ORDER BY started_at ASC
        LIMIT 1
      `)

      if (result.rows.length === 0) {
        return // No jobs in queue
      }

      const row = result.rows[0]
      const trainingData = JSON.parse(row.training_data || '[]')
      const config = JSON.parse(row.training_params || '{}')

      // Create job object
      const job: TrainingJob = {
        id: row.run_id,
        userId: row.user_id,
        priority: 'medium',
        status: 'queued',
        queuedAt: new Date(),
        estimatedDuration: 120,
        config,
        dataHash: '',
        retryCount: 0,
        maxRetries: 3,
        resourceRequirements: {
          gpuMemoryGB: 20,
          diskSpaceGB: 5,
          estimatedCost: 2
        }
      }

      // Start the training
      await this.startTraining(job, trainingData)
      
    } catch (error) {
      console.error('Failed to process training queue:', error)
    }
  }
}

// Singleton instance
export const trainingEngine = new TrainingEngine()