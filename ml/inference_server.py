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
        
        # Setup routes
        self.setup_routes()
        
        # Initialize Ollama model
        self.init_ollama_model()
    
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
                voice_cloner = get_voice_cloner()
                result = voice_cloner.process_voice_recording(
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
                voice_cloner = get_voice_cloner()
                result = voice_cloner.synthesize_speech(
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
            """Get voice cloning system status."""
            try:
                voice_cloner = get_voice_cloner()
                return voice_cloner.get_model_status()
            except Exception as e:
                logger.error(f"Voice status check failed: {e}")
                return {"error": str(e)}

        @self.app.get("/voice/profiles/{user_id}")
        async def list_voice_profiles(user_id: str):
            """List voice profiles for a user."""
            try:
                voice_cloner = get_voice_cloner()
                return voice_cloner.list_voice_profiles(user_id)
            except Exception as e:
                logger.error(f"Failed to list voice profiles: {e}")
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