"""
RTX 5090 ML Inference Server
Optimized for fine-tuned Mistral 7B models with voice synthesis integration
"""

import os
import gc
import json
import time
import logging
import asyncio
import psutil
from pathlib import Path
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

import torch
import torch.nn.functional as F
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    BitsAndBytesConfig,
    GenerationConfig
)
from peft import PeftModel
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel

# Import voice cloner for synthesis integration
from voice_cloner import get_voice_cloner

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    message: str
    user_context: Optional[str] = None
    max_length: Optional[int] = 512
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    voice_synthesis: Optional[bool] = False
    voice_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    confidence: float
    source: str
    model_version: str
    generation_time: float
    memory_usage: Dict[str, float]
    audio_url: Optional[str] = None

class ModelStatus(BaseModel):
    model_loaded: bool
    model_name: str
    device: str
    memory_allocated_gb: float
    memory_reserved_gb: float
    gpu_utilization: float
    available_models: List[str]
    voice_synthesis_available: bool

class RTX5090InferenceServer:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.current_model_path = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.voice_cloner = None
        
        # RTX 5090 optimization settings
        self.max_memory_gb = 20  # Leave 4GB for system
        self.batch_size = 1  # Optimize for single inference
        
        # Model search paths
        self.model_paths = [
            "/models/mistral-7b-fine-tuned",
            "/models/fine_tuned_models",
            "/models/huggingface/models--mistralai--Mistral-7B-Instruct-v0.2",
            "/models/huggingface/hub/models--mistralai--Mistral-7B-Instruct-v0.2"
        ]
        
        # Initialize voice synthesis
        self._initialize_voice_synthesis()
        
    def _initialize_voice_synthesis(self):
        """Initialize voice synthesis system."""
        try:
            self.voice_cloner = get_voice_cloner()
            if self.voice_cloner:
                logger.info("✅ Voice synthesis system initialized")
            else:
                logger.warning("⚠️ Voice synthesis not available")
        except Exception as e:
            logger.error(f"Voice synthesis initialization failed: {e}")
            self.voice_cloner = None

    def _get_rtx5090_config(self) -> BitsAndBytesConfig:
        """Get optimized quantization config for RTX 5090."""
        return BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
        )

    def _optimize_memory(self):
        """Optimize VRAM usage for RTX 5090."""
        if torch.cuda.is_available():
            # Clear cache
            torch.cuda.empty_cache()
            gc.collect()
            
            # Set memory fraction
            torch.cuda.set_per_process_memory_fraction(0.85)  # Use 85% of 24GB
            
            # Enable memory pool
            os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:512'
            
            logger.info("RTX 5090 memory optimization applied")

    def find_available_models(self) -> List[str]:
        """Find available Mistral models."""
        available_models = []
        
        for path_str in self.model_paths:
            path = Path(path_str)
            if path.exists():
                if (path / "config.json").exists():
                    available_models.append(str(path))
                    logger.info(f"Found model: {path}")
                
                # Check for adapter models (LoRA/QLoRA)
                for adapter_dir in path.glob("*/"):
                    if (adapter_dir / "adapter_config.json").exists():
                        available_models.append(str(adapter_dir))
                        logger.info(f"Found adapter model: {adapter_dir}")
        
        # Also check for base Mistral models
        base_models = [
            "mistralai/Mistral-7B-Instruct-v0.2",
            "mistralai/Mistral-7B-v0.1"
        ]
        
        for model_name in base_models:
            if model_name not in available_models:
                available_models.append(model_name)
        
        return available_models

    def load_model(self, model_path: Optional[str] = None) -> bool:
        """Load Mistral model with RTX 5090 optimization."""
        try:
            # Find best available model
            available_models = self.find_available_models()
            
            if not available_models:
                logger.error("No Mistral models found")
                return False
            
            target_model = model_path or available_models[0]
            
            if self.current_model_path == target_model and self.model is not None:
                logger.info(f"Model {target_model} already loaded")
                return True
            
            logger.info(f"Loading model: {target_model}")
            
            # Apply RTX 5090 optimizations
            self._optimize_memory()
            
            # Load tokenizer
            logger.info("Loading tokenizer...")
            self.tokenizer = AutoTokenizer.from_pretrained(
                target_model,
                trust_remote_code=True,
                padding_side="left"
            )
            
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Check if this is an adapter model
            is_adapter = Path(target_model).exists() and (Path(target_model) / "adapter_config.json").exists()
            
            if is_adapter:
                # Load base model first
                base_model_name = "mistralai/Mistral-7B-Instruct-v0.2"
                logger.info(f"Loading base model: {base_model_name}")
                
                self.model = AutoModelForCausalLM.from_pretrained(
                    base_model_name,
                    quantization_config=self._get_rtx5090_config(),
                    device_map="auto",
                    torch_dtype=torch.float16,
                    trust_remote_code=True,
                    use_cache=True
                )
                
                # Load adapter
                logger.info(f"Loading adapter: {target_model}")
                self.model = PeftModel.from_pretrained(self.model, target_model)
                
            else:
                # Load full model
                self.model = AutoModelForCausalLM.from_pretrained(
                    target_model,
                    quantization_config=self._get_rtx5090_config(),
                    device_map="auto",
                    torch_dtype=torch.float16,
                    trust_remote_code=True,
                    use_cache=True
                )
            
            # Move to GPU if available
            if self.device == "cuda":
                self.model = self.model.to(self.device)
            
            self.current_model_path = target_model
            
            # Print memory usage
            if torch.cuda.is_available():
                allocated = torch.cuda.memory_allocated() / 1e9
                reserved = torch.cuda.memory_reserved() / 1e9
                logger.info(f"GPU memory - Allocated: {allocated:.2f}GB, Reserved: {reserved:.2f}GB")
            
            logger.info("✅ Model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False

    def generate_response(
        self,
        message: str,
        user_context: Optional[str] = None,
        max_length: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9
    ) -> Dict[str, Any]:
        """Generate response using fine-tuned Mistral model."""
        if not self.model or not self.tokenizer:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        start_time = time.time()
        
        try:
            # Build prompt with context
            if user_context:
                prompt = f"<s>[INST] Context: {user_context}\n\nUser: {message} [/INST]"
            else:
                prompt = f"<s>[INST] {message} [/INST]"
            
            # Tokenize
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=1024
            ).to(self.device)
            
            # Generate
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_length,
                    temperature=temperature,
                    top_p=top_p,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                    repetition_penalty=1.1,
                    length_penalty=1.0,
                    early_stopping=True
                )
            
            # Decode response
            response_ids = outputs[0][inputs.input_ids.shape[1]:]
            response_text = self.tokenizer.decode(response_ids, skip_special_tokens=True)
            
            generation_time = time.time() - start_time
            
            # Calculate confidence based on generation quality
            confidence = self._calculate_confidence(response_text, generation_time)
            
            # Get memory usage
            memory_usage = self._get_memory_usage()
            
            return {
                "response": response_text.strip(),
                "confidence": confidence,
                "source": "mistral_7b_finetuned",
                "model_version": f"mistral-7b-{Path(self.current_model_path).name}",
                "generation_time": generation_time,
                "memory_usage": memory_usage
            }
            
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    def _calculate_confidence(self, response: str, generation_time: float) -> float:
        """Calculate response confidence based on various factors."""
        confidence = 0.8  # Base confidence for fine-tuned model
        
        # Adjust based on response length
        if len(response) < 10:
            confidence -= 0.2
        elif len(response) > 100:
            confidence += 0.1
        
        # Adjust based on generation time (faster usually means more confident)
        if generation_time < 2.0:
            confidence += 0.1
        elif generation_time > 10.0:
            confidence -= 0.1
        
        # Check for repetition or nonsensical content
        words = response.split()
        if len(set(words)) < len(words) * 0.6:  # Too much repetition
            confidence -= 0.2
        
        return max(0.1, min(1.0, confidence))

    def _get_memory_usage(self) -> Dict[str, float]:
        """Get current memory usage."""
        memory_usage = {
            "system_ram_gb": psutil.virtual_memory().used / 1e9,
            "system_ram_percent": psutil.virtual_memory().percent
        }
        
        if torch.cuda.is_available():
            memory_usage.update({
                "gpu_allocated_gb": torch.cuda.memory_allocated() / 1e9,
                "gpu_reserved_gb": torch.cuda.memory_reserved() / 1e9,
                "gpu_utilization": torch.cuda.utilization() if hasattr(torch.cuda, 'utilization') else 0.0
            })
        
        return memory_usage

    def get_status(self) -> ModelStatus:
        """Get current model status."""
        memory_usage = self._get_memory_usage()
        available_models = self.find_available_models()
        
        return ModelStatus(
            model_loaded=self.model is not None,
            model_name=Path(self.current_model_path).name if self.current_model_path else "none",
            device=self.device,
            memory_allocated_gb=memory_usage.get("gpu_allocated_gb", 0.0),
            memory_reserved_gb=memory_usage.get("gpu_reserved_gb", 0.0),
            gpu_utilization=memory_usage.get("gpu_utilization", 0.0),
            available_models=[Path(p).name for p in available_models],
            voice_synthesis_available=self.voice_cloner is not None
        )

    async def synthesize_voice(self, text: str, voice_id: Optional[str] = None) -> Optional[str]:
        """Synthesize voice for the response."""
        if not self.voice_cloner:
            return None
        
        try:
            result = self.voice_cloner.synthesize_speech(text=text, voice_id=voice_id)
            if result.get('success'):
                # Return relative path for web serving
                audio_path = result['audio_path']
                return audio_path.replace('/web/public', '').replace('/web', '')
            return None
        except Exception as e:
            logger.error(f"Voice synthesis failed: {e}")
            return None

    def cleanup(self):
        """Clean up resources."""
        if self.model:
            del self.model
        if self.tokenizer:
            del self.tokenizer
        
        torch.cuda.empty_cache()
        gc.collect()
        logger.info("Resources cleaned up")

# Global server instance
inference_server = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage server lifespan."""
    global inference_server
    
    # Startup
    logger.info("🚀 Starting RTX 5090 Inference Server...")
    inference_server = RTX5090InferenceServer()
    
    # Load default model
    logger.info("Loading default model...")
    if not inference_server.load_model():
        logger.error("Failed to load default model - server will start but won't be able to generate responses")
    
    yield
    
    # Shutdown
    logger.info("Shutting down RTX 5090 Inference Server...")
    if inference_server:
        inference_server.cleanup()

# Create FastAPI app with lifespan
app = FastAPI(
    title="RTX 5090 ML Inference Server",
    description="High-performance inference server for fine-tuned Mistral 7B models",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "rtx5090-inference",
        "gpu": "rtx5090",
        "model_loaded": inference_server.model is not None if inference_server else False
    }

@app.get("/status")
async def get_status():
    """Get detailed server status."""
    if not inference_server:
        raise HTTPException(status_code=503, detail="Server not ready")
    
    return inference_server.get_status()

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, background_tasks: BackgroundTasks):
    """Chat endpoint compatible with existing API route."""
    if not inference_server:
        raise HTTPException(status_code=503, detail="Server not ready")
    
    try:
        # Generate text response
        result = inference_server.generate_response(
            message=request.message,
            user_context=request.user_context,
            max_length=request.max_length,
            temperature=request.temperature,
            top_p=request.top_p
        )
        
        # Handle voice synthesis if requested
        audio_url = None
        if request.voice_synthesis and inference_server.voice_cloner:
            audio_url = await inference_server.synthesize_voice(
                text=result["response"],
                voice_id=request.voice_id
            )
        
        return ChatResponse(
            response=result["response"],
            confidence=result["confidence"],
            source=result["source"],
            model_version=result["model_version"],
            generation_time=result["generation_time"],
            memory_usage=result["memory_usage"],
            audio_url=audio_url
        )
        
    except Exception as e:
        logger.error(f"Chat request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@app.post("/models/load")
async def load_model(model_path: Optional[str] = None):
    """Load a specific model."""
    if not inference_server:
        raise HTTPException(status_code=503, detail="Server not ready")
    
    success = inference_server.load_model(model_path)
    if success:
        return {"success": True, "model": inference_server.current_model_path}
    else:
        raise HTTPException(status_code=500, detail="Failed to load model")

@app.get("/models/available")
async def get_available_models():
    """Get list of available models."""
    if not inference_server:
        raise HTTPException(status_code=503, detail="Server not ready")
    
    models = inference_server.find_available_models()
    return {"models": models, "count": len(models)}

@app.post("/memory/cleanup")
async def cleanup_memory():
    """Force memory cleanup."""
    if not inference_server:
        raise HTTPException(status_code=503, detail="Server not ready")
    
    torch.cuda.empty_cache()
    gc.collect()
    
    memory_usage = inference_server._get_memory_usage()
    return {"success": True, "memory_usage": memory_usage}

if __name__ == "__main__":
    # Verify RTX 5090 compatibility
    logger.info("🔍 Checking RTX 5090 compatibility...")
    
    if torch.cuda.is_available():
        device_name = torch.cuda.get_device_name(0)
        capability = torch.cuda.get_device_capability(0)
        logger.info(f"GPU: {device_name}")
        logger.info(f"CUDA Capability: {capability}")
        
        if capability >= (8, 0):  # RTX 5090 has sm_120 but older cards work too
            logger.info("✅ GPU compatible with inference server")
        else:
            logger.warning("⚠️ GPU may not be optimal for this workload")
    else:
        logger.warning("⚠️ CUDA not available - running on CPU")
    
    # Start server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True
    )