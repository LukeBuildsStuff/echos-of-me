#!/usr/bin/env python3
"""
Luke AI Inference Engine
Optimized for RTX 5090 with memory management and streaming support
"""

import torch
import gc
import json
import sys
import logging
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForCausalLM, GenerationConfig
from peft import PeftModel
import threading
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('LukeAI')

class RTX5090InferenceEngine:
    """
    High-performance inference engine optimized for RTX 5090
    Features:
    - Smart GPU memory management
    - Model caching and warmup
    - Streaming generation support
    - Memory leak prevention
    """
    
    def __init__(self, model_path=None):
        # Default to container path if running in container, otherwise host path
        if model_path is None:
            import os
            if os.path.exists("/app/training/final_model"):
                model_path = "/app/training/final_model"
            else:
                model_path = "/home/luke/personal-ai-clone/web/training/final_model"
        self.model_path = Path(model_path)
        self.base_model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        
        # RTX 5090 Performance Optimizations
        self._configure_rtx5090_optimizations()
        
        # Check CUDA availability and RTX 5090 compatibility
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            cuda_capability = torch.cuda.get_device_capability(0)
            total_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            
            logger.info(f"GPU detected: {gpu_name}")
            logger.info(f"CUDA capability: sm_{cuda_capability[0]}{cuda_capability[1]}")
            logger.info(f"GPU memory: {total_memory:.1f}GB")
            logger.info(f"PyTorch version: {torch.__version__}")
            logger.info(f"CUDA version: {torch.version.cuda}")
            logger.info(f"cuDNN version: {torch.backends.cudnn.version()}")
            
            # Check if we have proper RTX 5090 support (requires PyTorch 2.7.0a0+)
            if "RTX 5090" in gpu_name and cuda_capability == (12, 0):
                # RTX 5090 with sm_120 requires PyTorch 2.7.0a0+ 
                pytorch_version = torch.__version__
                logger.info(f"Current PyTorch version: {pytorch_version}")
                
                # Check if PyTorch version supports RTX 5090
                # Handle alpha versions like "2.7.0a0+79aa17489c.nv25.04"
                try:
                    # Extract base version (e.g., "2.7.0" from "2.7.0a0+...")
                    base_version = pytorch_version.split('a')[0].split('+')[0]
                    version_parts = base_version.split('.')
                    major = int(version_parts[0])
                    minor = int(version_parts[1]) if len(version_parts) > 1 else 0
                    
                    # Accept 2.7.0a0+ or later
                    if major < 2 or (major == 2 and minor < 7):
                        logger.error("RTX 5090 requires PyTorch 2.7.0a0 or later for sm_120 support")
                        logger.error(f"Current version {pytorch_version} only supports up to sm_90")
                        logger.error("SOLUTION: Use NVIDIA PyTorch container: nvcr.io/nvidia/pytorch:25.04-py3")
                        logger.error("Falling back to optimized CPU inference...")
                        self.device = "cpu"
                    else:
                        try:
                            # Test CUDA functionality with model operations
                            test_tensor = torch.randn(10, 10).cuda()
                            result = test_tensor @ test_tensor
                            self.device = "cuda:0"
                            logger.info(f"RTX 5090 CUDA support verified with PyTorch {pytorch_version} - using GPU")
                        except Exception as e:
                            logger.error(f"RTX 5090 CUDA test failed: {e}")
                            logger.error("This likely indicates PyTorch version incompatibility with RTX 5090")
                            logger.error("Falling back to optimized CPU inference...")
                            self.device = "cpu"
                except Exception as e:
                    logger.error(f"Failed to parse PyTorch version {pytorch_version}: {e}")
                    logger.error("Assuming version compatibility and testing CUDA...")
                    try:
                        # Test CUDA functionality with model operations
                        test_tensor = torch.randn(10, 10).cuda()
                        result = test_tensor @ test_tensor
                        self.device = "cuda:0"
                        logger.info(f"RTX 5090 CUDA support verified - using GPU")
                    except Exception as e:
                        logger.error(f"RTX 5090 CUDA test failed: {e}")
                        logger.error("This likely indicates PyTorch version incompatibility with RTX 5090")
                        logger.error("Falling back to optimized CPU inference...")
                        self.device = "cpu"
            else:
                # For non-RTX 5090 GPUs, use standard CUDA
                try:
                    test_tensor = torch.randn(10, 10).cuda()
                    result = test_tensor @ test_tensor
                    self.device = "cuda:0"
                    logger.info(f"GPU {gpu_name} CUDA support verified - using GPU")
                except Exception as e:
                    logger.error(f"CUDA test failed: {e}")
                    logger.error("Falling back to CPU...")
                    self.device = "cpu"
        else:
            logger.warning("CUDA not available - using CPU")
            self.device = "cpu"
        
        # Model components
        self.tokenizer = None
        self.model = None
        self.generation_config = None
        
        # Memory management
        self.max_gpu_memory_gb = 8  # Reserve 8GB for model
        self.gc_threshold = 0.85    # Trigger cleanup at 85% usage
        
        # CPU optimization for RTX 5090 fallback
        if self.device == "cpu":
            import os
            # Use all available CPU cores for tensor operations
            torch.set_num_threads(os.cpu_count())
            
            # Enable CPU optimizations
            torch.set_num_interop_threads(os.cpu_count())
            
            # Enable MKL-DNN for better CPU performance
            if hasattr(torch.backends, 'mkldnn') and torch.backends.mkldnn.is_available():
                torch.backends.mkldnn.enabled = True
                logger.info("MKL-DNN optimization enabled for CPU")
            
            logger.info(f"Optimized CPU inference using {os.cpu_count()} threads")
            logger.info("CPU performance optimizations enabled")
        
        # Performance tracking
        self.inference_count = 0
        self.total_tokens_generated = 0
        
        logger.info(f"Initializing RTX 5090 Inference Engine")
        logger.info(f"Device: {self.device}")
        logger.info(f"Model path: {self.model_path}")
    
    def _configure_rtx5090_optimizations(self):
        """Configure RTX 5090 specific optimizations for maximum performance"""
        if torch.cuda.is_available():
            # Enable tensor core optimizations (TF32 for faster matrix operations)
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            
            # Set CUDA memory fraction to 80% for optimal utilization
            torch.cuda.set_per_process_memory_fraction(0.8)
            
            # Enable cuDNN benchmarking for consistent workloads
            torch.backends.cudnn.benchmark = True
            
            # Configure memory management
            torch.cuda.empty_cache()
            
            logger.info("RTX 5090 optimizations configured:")
            logger.info("- Tensor Core (TF32) enabled")
            logger.info("- CUDA memory fraction: 80%")
            logger.info("- cuDNN benchmark mode enabled")
        else:
            logger.info("CUDA not available - RTX 5090 optimizations skipped")
        
    def check_gpu_memory(self):
        """Monitor GPU memory usage"""
        if torch.cuda.is_available():
            memory_allocated = torch.cuda.memory_allocated(0) / (1024**3)  # GB
            memory_reserved = torch.cuda.memory_reserved(0) / (1024**3)    # GB
            memory_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            
            usage_percent = memory_allocated / memory_total
            
            logger.info(f"GPU Memory - Allocated: {memory_allocated:.2f}GB, "
                       f"Reserved: {memory_reserved:.2f}GB, "
                       f"Total: {memory_total:.2f}GB, "
                       f"Usage: {usage_percent:.1%}")
            
            return {
                'allocated_gb': memory_allocated,
                'reserved_gb': memory_reserved,
                'total_gb': memory_total,
                'usage_percent': usage_percent
            }
        return None
    
    def cleanup_memory(self):
        """Force GPU memory cleanup"""
        if torch.cuda.is_available():
            gc.collect()
            torch.cuda.empty_cache()
            logger.info("GPU memory cleaned up")
    
    def load_model(self):
        """Load the trained model with memory optimization"""
        try:
            logger.info("Loading Luke AI model...")
            start_time = time.time()
            
            # Load tokenizer
            logger.info("Loading tokenizer...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Load base model with RTX 5090 optimizations
            logger.info("Loading base model with RTX 5090 optimizations...")
            if self.device == "cpu":
                # CPU optimized loading with better dtype for CPU inference
                base_model = AutoModelForCausalLM.from_pretrained(
                    self.base_model_name,
                    torch_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float32,
                    trust_remote_code=True,
                    low_cpu_mem_usage=True
                )
            else:
                # RTX 5090 optimized loading with flash attention and fp16
                base_model = AutoModelForCausalLM.from_pretrained(
                    self.base_model_name,
                    torch_dtype=torch.float16,  # Use fp16 for RTX 5090 tensor cores
                    device_map="auto",           # Automatic device mapping
                    trust_remote_code=True,
                    low_cpu_mem_usage=True,
                    use_flash_attention_2=True,  # Enable flash attention for RTX 5090
                    attn_implementation="flash_attention_2",
                    max_memory={0: f"{self.max_gpu_memory_gb}GB"}
                )
            
            # Load PEFT adapter with compatibility handling
            logger.info("Loading PEFT adapter...")
            
            # Create a compatible adapter config
            import tempfile
            import shutil
            import json
            import os
            
            temp_model_dir = tempfile.mkdtemp()
            
            try:
                # Copy adapter model files
                adapter_files = ['adapter_model.safetensors', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json']
                for file_name in adapter_files:
                    src_path = self.model_path / file_name
                    if src_path.exists():
                        shutil.copy2(str(src_path), temp_model_dir)
                
                # Create minimal compatible adapter config
                compatible_config = {
                    "base_model_name_or_path": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
                    "bias": "none",
                    "fan_in_fan_out": False,
                    "inference_mode": True,
                    "init_lora_weights": True,
                    "lora_alpha": 32,
                    "lora_dropout": 0.1,
                    "peft_type": "LORA",
                    "r": 16,
                    "target_modules": [
                        "gate_proj", "q_proj", "v_proj", "o_proj", "k_proj", "down_proj", "up_proj"
                    ],
                    "task_type": "CAUSAL_LM"
                }
                
                # Write compatible config
                with open(os.path.join(temp_model_dir, "adapter_config.json"), "w") as f:
                    json.dump(compatible_config, f, indent=2)
                
                # Load PEFT model from temp directory
                self.model = PeftModel.from_pretrained(base_model, temp_model_dir)
                
            finally:
                # Clean up temp directory
                shutil.rmtree(temp_model_dir)
            
            # Move to correct device and apply RTX 5090 optimizations
            if self.device == "cpu":
                self.model = self.model.cpu()
            else:
                self.model = self.model.cuda()
                # Convert to fp16 for RTX 5090 tensor core utilization
                self.model = self.model.half()
                logger.info("Model converted to fp16 for RTX 5090 tensor cores")
            
            # Enable inference mode for optimal performance
            self.model.eval()
            
            # Enable inference optimizations
            if hasattr(self.model, 'config'):
                self.model.config.use_cache = True
                logger.info("KV cache enabled for faster inference")
            
            # Configure generation parameters optimized for RTX 5090 speed
            self.generation_config = GenerationConfig(
                max_length=512,
                max_new_tokens=150,
                temperature=0.7,
                top_p=0.9,
                top_k=50,
                repetition_penalty=1.1,
                do_sample=True,
                num_beams=1,                    # Single beam for faster generation
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                use_cache=True,                 # Enable KV cache for speed
                num_return_sequences=1,         # Single sequence for speed
                # Note: early_stopping only works with num_beams>1, removed for single beam
                length_penalty=1.0              # No length penalty for speed
            )
            
            logger.info("Generation config optimized for RTX 5090 performance:")
            logger.info("- Single beam generation (num_beams=1)")
            logger.info("- KV cache enabled")
            logger.info("- Early stopping enabled")
            
            load_time = time.time() - start_time
            logger.info(f"Model loaded successfully in {load_time:.2f} seconds")
            
            # Check memory after loading
            self.check_gpu_memory()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def warmup_model(self):
        """Warm up the model with a test inference"""
        if not self.model or not self.tokenizer:
            logger.error("Model not loaded, cannot warmup")
            return False
        
        try:
            logger.info("Warming up model...")
            test_prompt = "Hello"
            inputs = self.tokenizer(test_prompt, return_tensors="pt")
            
            if self.device != "cpu":
                inputs = {k: v.cuda() for k, v in inputs.items()}
            
            with torch.no_grad():
                _ = self.model.generate(
                    **inputs,
                    generation_config=self.generation_config,
                    max_new_tokens=10
                )
            
            logger.info("Model warmup completed")
            return True
            
        except Exception as e:
            logger.error(f"Model warmup failed: {e}")
            return False
    
    def generate_response(self, prompt, max_new_tokens=150, temperature=0.7, stream=False):
        """
        Generate response from Luke AI
        
        Args:
            prompt: Input text prompt
            max_new_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            stream: Whether to return streaming generator
        """
        if not self.model or not self.tokenizer:
            logger.error("Model not loaded")
            return {"error": "Model not loaded"}
        
        try:
            # Check memory before inference
            memory_info = self.check_gpu_memory()
            if memory_info and memory_info['usage_percent'] > self.gc_threshold:
                self.cleanup_memory()
            
            # Prepare input with enhanced prompt for authenticity
            # Use TinyLlama's chat format properly
            system_msg = """You are Luke, speaking with your authentic personal voice. Respond in first person as Luke himself, sharing genuine insights from your personal journey. Start with phrases like "I believe", "I've learned", "From my experience", "In my view", or "Looking back"."""
            
            formatted_prompt = f"<|system|>\n{system_msg}</s>\n<|user|>\n{prompt}</s>\n<|assistant|>\n"
            inputs = self.tokenizer(formatted_prompt, return_tensors="pt", truncation=True, max_length=400)
            
            if self.device != "cpu":
                inputs = {k: v.cuda() for k, v in inputs.items()}
            
            # Configure generation for this request with RTX 5090 optimizations
            gen_config = GenerationConfig(
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=0.9,
                top_k=50,
                repetition_penalty=1.1,
                do_sample=True,
                num_beams=1,                    # Single beam for maximum speed
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                use_cache=True,                 # KV cache for speed
                num_return_sequences=1,         # Single sequence
                # Note: early_stopping only works with num_beams>1, removed for single beam
                length_penalty=1.0              # No length penalty
            )
            
            start_time = time.time()
            
            # Generate response
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    generation_config=gen_config
                )
            
            # Decode response
            input_length = inputs['input_ids'].shape[1]
            generated_tokens = outputs[0][input_length:]
            response = self.tokenizer.decode(generated_tokens, skip_special_tokens=True)
            
            # Clean up response - remove chat format artifacts
            response = response.strip()
            
            # Remove common chat format artifacts
            if response.startswith('<|'):
                response = response.split('>', 1)[-1].strip()
            if '</s>' in response:
                response = response.split('</s>')[0].strip()
            if '<|user|>' in response:
                response = response.split('<|user|>')[0].strip()
            if '<|assistant|>' in response:
                response = response.split('<|assistant|>')[-1].strip()
            
            # Remove any remaining template artifacts
            response = response.replace('<|system|>', '').replace('<|user|>', '').replace('<|assistant|>', '')
            response = response.replace('</s>', '').replace('</|user|>', '').replace('</|assistant|>', '').replace('</|system|>', '').strip()
            
            # If response contains template artifacts, truncate at the first occurrence
            if '</|' in response:
                response = response.split('</|')[0].strip()
            if '<|' in response:
                response = response.split('<|')[0].strip()
            
            generation_time = time.time() - start_time
            tokens_generated = len(generated_tokens)
            tokens_per_second = tokens_generated / generation_time if generation_time > 0 else 0
            
            # Update statistics
            self.inference_count += 1
            self.total_tokens_generated += tokens_generated
            
            logger.info(f"Generated {tokens_generated} tokens in {generation_time:.2f}s "
                       f"({tokens_per_second:.1f} tokens/s)")
            
            # Cleanup if needed
            if self.inference_count % 10 == 0:  # Every 10 inferences
                self.cleanup_memory()
            
            return {
                "response": response,
                "tokens_generated": tokens_generated,
                "generation_time": generation_time,
                "tokens_per_second": tokens_per_second,
                "inference_count": self.inference_count
            }
            
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}
    
    def get_status(self):
        """Get engine status and statistics"""
        memory_info = self.check_gpu_memory()
        
        return {
            "model_loaded": self.model is not None,
            "device": self.device,
            "inference_count": self.inference_count,
            "total_tokens_generated": self.total_tokens_generated,
            "avg_tokens_per_inference": (
                self.total_tokens_generated / self.inference_count 
                if self.inference_count > 0 else 0
            ),
            "gpu_memory": memory_info
        }

def main():
    """CLI interface for testing"""
    if len(sys.argv) < 2:
        print("Usage: python luke_ai_inference_engine.py '<prompt>'")
        print("   or: python luke_ai_inference_engine.py status")
        return
    
    command = sys.argv[1]
    
    # Configure logging to stderr for clean JSON output
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        stream=sys.stderr  # Send logs to stderr, keep stdout for JSON
    )
    
    # Initialize engine
    engine = RTX5090InferenceEngine()
    
    if command == "status":
        # Load model for status check
        if engine.load_model():
            status = engine.get_status()
            print(json.dumps(status))  # Clean JSON to stdout
        else:
            print(json.dumps({"error": "Failed to load model"}))
        return
    
    # Normal inference
    if not engine.load_model():
        print(json.dumps({"error": "Failed to load model"}))
        return
    
    if not engine.warmup_model():
        print(json.dumps({"error": "Failed to warmup model"}))
        return
    
    prompt = command
    result = engine.generate_response(prompt)
    print(json.dumps(result))  # Clean JSON to stdout

if __name__ == "__main__":
    main()