"""
Mistral 7B Inference Server
Serves fine-tuned models for AI Echo chat
"""

import os
import torch
import json
import logging
import requests
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import glob
from datetime import datetime
from voice_cloner import get_voice_cloner

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    user_context: Optional[str] = None
    max_length: Optional[int] = 512
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9

class ChatResponse(BaseModel):
    response: str
    confidence: float
    model_version: str
    generation_time: float
    source: str = "trained_model"

class ModelStatus(BaseModel):
    model_loaded: bool
    model_version: str
    model_path: Optional[str]
    device: str
    memory_usage: Optional[Dict[str, float]]

class MistralInferenceServer:
    def __init__(self):
        self.app = FastAPI(title="Mistral AI Echo Inference Server")
        self.model = None
        self.tokenizer = None
        self.model_version = "base"
        self.model_path = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.ollama_url = os.getenv('OLLAMA_URL', 'http://ollama:11434')
        self.use_ollama = True  # Default to Ollama for Mistral-7B
        
        # Initialize voice cloner on startup
        self.voice_cloner = None
        self.init_voice_cloner()
        
        # Setup routes
        self.setup_routes()
        
        # Initialize Ollama model
        self.init_ollama_model()

    def init_voice_cloner(self):
        """Initialize voice cloner and pre-load XTTS-v2 model."""
        try:
            logger.info("Initializing voice cloning system...")
            self.voice_cloner = get_voice_cloner()
            
            # Check if voice cloner initialized successfully
            if self.voice_cloner and self.voice_cloner.tts:
                logger.info("✓ Voice cloning system ready with XTTS-v2 model")
                
                # Log discovered voice profiles
                profiles = self.voice_cloner.list_voice_profiles()
                if profiles.get("success"):
                    profile_count = profiles.get("count", 0)
                    logger.info(f"✓ Found {profile_count} voice profiles ready for synthesis")
                    
                    # Log specific profiles for debugging
                    for voice_id, profile in profiles.get("profiles", {}).items():
                        logger.info(f"  - {voice_id}: {profile.get('source_file', 'unknown')} ({profile.get('user_id', 'unknown')})")
                else:
                    logger.warning("Voice profiles discovery failed")
            else:
                logger.warning("⚠ Voice cloning system not available (TTS model failed to load)")
                
        except Exception as e:
            logger.error(f"Failed to initialize voice cloning: {e}")
            self.voice_cloner = None

    def check_voice_health(self):
        """Perform health checks on voice cloning system."""
        try:
            if not self.voice_cloner:
                return {"status": "unhealthy", "reason": "voice cloner not initialized"}
                
            if not self.voice_cloner.tts:
                return {"status": "unhealthy", "reason": "TTS model not loaded"}
                
            # Check GPU memory if available
            if torch.cuda.is_available():
                memory_allocated = torch.cuda.memory_allocated() / 1e9
                memory_reserved = torch.cuda.memory_reserved() / 1e9
                
                if memory_allocated > 20:  # More than 20GB used might indicate memory leak
                    return {
                        "status": "warning", 
                        "reason": f"high GPU memory usage: {memory_allocated:.1f}GB"
                    }
            
            # Check if voice profiles are available
            profiles = self.voice_cloner.list_voice_profiles()
            if not profiles.get("success") or profiles.get("count", 0) == 0:
                return {"status": "warning", "reason": "no voice profiles available"}
                
            return {"status": "healthy", "profiles_count": profiles.get("count", 0)}
            
        except Exception as e:
            return {"status": "unhealthy", "reason": f"health check failed: {str(e)}"}
    
    def init_ollama_model(self):
        """Initialize Ollama with Mistral-7B model."""
        try:
            logger.info("Initializing Ollama with Mistral-7B...")
            
            # Check if Ollama is available
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=10)
            if response.status_code == 200:
                models = response.json().get('models', [])
                mistral_available = any('mistral' in model.get('name', '') for model in models)
                
                if not mistral_available:
                    logger.info("Pulling Mistral-7B model via Ollama...")
                    # Pull the model
                    pull_response = requests.post(
                        f"{self.ollama_url}/api/pull",
                        json={"name": "mistral:7b-instruct"},
                        timeout=600  # 10 minutes for model download
                    )
                    if pull_response.status_code == 200:
                        logger.info("Mistral-7B model pulled successfully")
                        self.model_version = "mistral:7b-instruct"
                    else:
                        logger.error(f"Failed to pull Mistral model: {pull_response.text}")
                        self.use_ollama = False
                else:
                    logger.info("Mistral model already available in Ollama")
                    self.model_version = "mistral:7b-instruct"
            else:
                logger.warning("Ollama not available, falling back to local model")
                self.use_ollama = False
                self.load_latest_model()
                
        except Exception as e:
            logger.error(f"Failed to initialize Ollama: {e}")
            self.use_ollama = False
            self.load_latest_model()

    def setup_routes(self):
        """Setup FastAPI routes."""
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint."""
            return {"status": "healthy", "timestamp": datetime.now().isoformat()}

        @self.app.get("/model/status", response_model=ModelStatus)
        async def get_model_status():
            """Get current model status."""
            memory_usage = None
            if torch.cuda.is_available():
                memory_usage = {
                    "allocated_gb": torch.cuda.memory_allocated() / 1e9,
                    "reserved_gb": torch.cuda.memory_reserved() / 1e9,
                    "max_allocated_gb": torch.cuda.max_memory_allocated() / 1e9
                }
            
            model_loaded = self.use_ollama or self.model is not None
            model_path = "ollama" if self.use_ollama else self.model_path
            
            return ModelStatus(
                model_loaded=model_loaded,
                model_version=self.model_version,
                model_path=model_path,
                device=str(self.device),
                memory_usage=memory_usage
            )

        @self.app.post("/model/reload")
        async def reload_model():
            """Reload the latest model."""
            try:
                success = self.load_latest_model()
                if success:
                    return {"status": "success", "model_version": self.model_version}
                else:
                    raise HTTPException(status_code=500, detail="Failed to reload model")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Model reload failed: {str(e)}")

        @self.app.post("/chat", response_model=ChatResponse)
        async def chat(request: ChatRequest):
            """Generate AI response."""
            if not self.use_ollama and (self.model is None or self.tokenizer is None):
                raise HTTPException(status_code=503, detail="Model not loaded")
            
            try:
                start_time = datetime.now()
                
                # Generate response using Ollama or local model
                if self.use_ollama:
                    response_text, confidence = self.generate_ollama_response(
                        message=request.message,
                        user_context=request.user_context,
                        max_length=request.max_length,
                        temperature=request.temperature,
                        top_p=request.top_p
                    )
                else:
                    response_text, confidence = self.generate_response(
                        message=request.message,
                        user_context=request.user_context,
                        max_length=request.max_length,
                        temperature=request.temperature,
                        top_p=request.top_p
                    )
                
                generation_time = (datetime.now() - start_time).total_seconds()
                
                return ChatResponse(
                    response=response_text,
                    confidence=confidence,
                    model_version=self.model_version,
                    generation_time=generation_time
                )
                
            except Exception as e:
                logger.error(f"Chat generation failed: {e}")
                raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

        # Voice cloning endpoints
        @self.app.post("/voice/process")
        async def process_voice(request: dict):
            """Process voice recording for cloning."""
            try:
                if not self.voice_cloner:
                    return {"success": False, "error": "Voice cloning system not available"}
                
                result = self.voice_cloner.process_voice_recording(
                    audio_path=request.get("audioPath"),
                    voice_id=request.get("voiceId"),
                    user_id=request.get("userId")
                )
                return result
            except Exception as e:
                logger.error(f"Voice processing failed: {e}")
                return {"success": False, "error": str(e)}

        @self.app.post("/voice/synthesize")
        async def synthesize_voice(request: dict):
            """Synthesize speech using cloned voice."""
            try:
                if not self.voice_cloner:
                    return {"success": False, "error": "TTS model not available"}
                
                if not self.voice_cloner.tts:
                    return {"success": False, "error": "TTS model not loaded"}
                
                result = self.voice_cloner.synthesize_speech(
                    text=request.get("text"),
                    voice_id=request.get("voiceId"),
                    output_path=request.get("outputPath"),
                    language=request.get("language", "en")
                )
                return result
            except Exception as e:
                logger.error(f"Voice synthesis failed: {e}")
                return {"success": False, "error": str(e)}

        @self.app.get("/voice/status")
        async def voice_status():
            """Get voice cloning system status with health checks."""
            try:
                if not self.voice_cloner:
                    return {
                        "tts_available": False,
                        "model_loaded": False,
                        "error": "Voice cloning system not initialized"
                    }
                
                status = self.voice_cloner.get_model_status()
                
                # Add health check information
                status["health_status"] = self.check_voice_health()
                
                return status
            except Exception as e:
                logger.error(f"Voice status check failed: {e}")
                return {"error": str(e)}

        @self.app.post("/voice/health/recover")
        async def recover_voice_system():
            """Attempt to recover voice cloning system."""
            try:
                logger.info("Attempting voice system recovery...")
                self.init_voice_cloner()
                
                if self.voice_cloner and self.voice_cloner.tts:
                    return {"success": True, "message": "Voice system recovered successfully"}
                else:
                    return {"success": False, "error": "Failed to recover voice system"}
                    
            except Exception as e:
                logger.error(f"Voice recovery failed: {e}")
                return {"success": False, "error": str(e)}

        @self.app.get("/voice/profiles/{user_id}")
        async def list_voice_profiles(user_id: str):
            """List voice profiles for a user."""
            try:
                if not self.voice_cloner:
                    return {"success": False, "error": "Voice cloning system not available"}
                    
                return self.voice_cloner.list_voice_profiles(user_id)
            except Exception as e:
                logger.error(f"Failed to list voice profiles: {e}")
                return {"success": False, "error": str(e)}

        # External model management endpoints
        @self.app.get("/voice/models")
        async def list_external_models():
            """List all available external models."""
            try:
                if not self.voice_cloner:
                    return {"success": False, "error": "Voice cloning system not available"}
                    
                return self.voice_cloner.list_external_models()
            except Exception as e:
                logger.error(f"Failed to list external models: {e}")
                return {"success": False, "error": str(e)}

        @self.app.get("/voice/models/{user_id}")
        async def list_user_models(user_id: str):
            """List external models for a specific user."""
            try:
                if not self.voice_cloner:
                    return {"success": False, "error": "Voice cloning system not available"}
                    
                return self.voice_cloner.list_external_models(user_id)
            except Exception as e:
                logger.error(f"Failed to list user models: {e}")
                return {"success": False, "error": str(e)}

        @self.app.post("/voice/models/load")
        async def load_external_model(request: dict):
            """Load a specific external model."""
            try:
                if not self.voice_cloner:
                    return {"success": False, "error": "Voice cloning system not available"}
                
                model_id = request.get("model_id")
                if not model_id:
                    return {"success": False, "error": "model_id required"}
                
                result = self.voice_cloner.load_external_model(model_id)
                return result
            except Exception as e:
                logger.error(f"Failed to load external model: {e}")
                return {"success": False, "error": str(e)}

        @self.app.post("/voice/models/reload-base")
        async def reload_base_model():
            """Reload the base XTTS-v2 model."""
            try:
                if not self.voice_cloner:
                    return {"success": False, "error": "Voice cloning system not available"}
                
                result = self.voice_cloner.reload_base_model()
                return result
            except Exception as e:
                logger.error(f"Failed to reload base model: {e}")
                return {"success": False, "error": str(e)}

        @self.app.post("/voice/models/refresh")
        async def refresh_external_models():
            """Refresh the external models discovery."""
            try:
                if not self.voice_cloner:
                    return {"success": False, "error": "Voice cloning system not available"}
                
                logger.info("Refreshing external models...")
                self.voice_cloner.discover_external_models()
                
                models = self.voice_cloner.list_external_models()
                return {
                    "success": True,
                    "message": "External models refreshed",
                    "models_found": models.get("count", 0)
                }
            except Exception as e:
                logger.error(f"Failed to refresh external models: {e}")
                return {"success": False, "error": str(e)}

    def find_latest_model(self) -> Optional[str]:
        """Find the latest trained model checkpoint."""
        checkpoint_dirs = glob.glob("/models/checkpoints/mistral-7b-*")
        
        if not checkpoint_dirs:
            logger.warning("No trained model checkpoints found")
            return None
            
        # Sort by timestamp in filename
        checkpoint_dirs.sort(reverse=True)
        latest_checkpoint = checkpoint_dirs[0]
        
        logger.info(f"Found latest checkpoint: {latest_checkpoint}")
        return latest_checkpoint

    def load_base_model(self):
        """Load the base model (fallback)."""
        try:
            logger.info("Loading base model...")
            
            # Use Mistral-7B-Instruct as fallback (will require auth)
            model_name = "mistralai/Mistral-7B-Instruct-v0.2"
            
            self.tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                cache_dir="/models/huggingface",
                trust_remote_code=True
            )
            
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                cache_dir="/models/huggingface",
                torch_dtype=torch.float16,
                device_map="auto",
                trust_remote_code=True
            )
            
            self.model_version = "base_model"
            self.model_path = model_name
            
            logger.info("Base model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load base model: {e}")
            return False

    def load_fine_tuned_model(self, checkpoint_path: str):
        """Load a fine-tuned model."""
        try:
            logger.info(f"Loading fine-tuned model from: {checkpoint_path}")
            
            # Load base model first
            base_model_name = "mistralai/Mistral-7B-Instruct-v0.2"
            
            self.tokenizer = AutoTokenizer.from_pretrained(
                base_model_name,
                cache_dir="/models/huggingface",
                trust_remote_code=True
            )
            
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                cache_dir="/models/huggingface",
                torch_dtype=torch.float16,
                device_map="auto",
                trust_remote_code=True
            )
            
            # Load LoRA adapter
            self.model = PeftModel.from_pretrained(
                base_model,
                checkpoint_path,
                torch_dtype=torch.float16
            )
            
            # Extract version from path
            self.model_version = os.path.basename(checkpoint_path)
            self.model_path = checkpoint_path
            
            logger.info(f"Fine-tuned model loaded successfully: {self.model_version}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load fine-tuned model: {e}")
            return False

    def load_latest_model(self) -> bool:
        """Load the latest available model."""
        try:
            # Try to load fine-tuned model first
            latest_checkpoint = self.find_latest_model()
            
            if latest_checkpoint and os.path.exists(latest_checkpoint):
                if self.load_fine_tuned_model(latest_checkpoint):
                    return True
            
            # Fallback to base model
            logger.info("No fine-tuned model found, loading base model")
            return self.load_base_model()
            
        except Exception as e:
            logger.error(f"Failed to load any model: {e}")
            return False

    def generate_ollama_response(
        self,
        message: str,
        user_context: Optional[str] = None,
        max_length: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9
    ) -> tuple[str, float]:
        """Generate AI response using Ollama."""
        
        # Build the prompt for Mistral
        if user_context:
            prompt = f"{user_context}\n\nHuman: {message}\nAssistant:"
        else:
            prompt = f"Human: {message}\nAssistant:"
        
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": "mistral:7b-instruct",
                    "prompt": prompt,
                    "options": {
                        "temperature": temperature,
                        "top_p": top_p,
                        "num_predict": max_length
                    },
                    "stream": False
                },
                timeout=120  # 2 minute timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("response", "").strip()
                
                # Calculate confidence based on response length and quality
                confidence = 0.85 if len(response_text.split()) > 5 else 0.7
                
                return response_text, confidence
            else:
                logger.error(f"Ollama request failed: {response.status_code} - {response.text}")
                return "I'm sorry, I'm having trouble responding right now.", 0.1
                
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            return "I'm sorry, I'm having trouble responding right now.", 0.1

    def generate_response(
        self,
        message: str,
        user_context: Optional[str] = None,
        max_length: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9
    ) -> tuple[str, float]:
        """Generate AI response using the loaded model."""
        
        # Build the prompt for Mistral
        if user_context:
            prompt = f"<s>[INST] {user_context}\n\nQuestion: {message} [/INST] "
        else:
            prompt = f"<s>[INST] {message} [/INST] "
        
        # Tokenize input
        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            max_length=2048,
            truncation=True,
            padding=True
        ).to(self.device)
        
        # Generate response
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_length,
                temperature=temperature,
                top_p=top_p,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                repetition_penalty=1.1
            )
        
        # Decode response
        generated_tokens = outputs[0][inputs.input_ids.shape[-1]:]
        response = self.tokenizer.decode(generated_tokens, skip_special_tokens=True)
        
        # Clean up response
        response = response.strip()
        
        # Calculate confidence based on model type and response length
        confidence = 0.9 if "fine-tuned" in self.model_version else 0.7
        if len(response.split()) < 5:  # Very short responses are less confident
            confidence *= 0.8
            
        return response, confidence

def create_app() -> FastAPI:
    """Create and return the FastAPI app."""
    server = MistralInferenceServer()
    return server.app

def main():
    """Run the inference server."""
    logger.info("Starting Mistral Inference Server...")
    
    # Create server instance
    server = MistralInferenceServer()
    
    # Run with uvicorn
    uvicorn.run(
        server.app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

if __name__ == "__main__":
    main()