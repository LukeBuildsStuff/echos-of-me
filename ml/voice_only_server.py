"""
Voice-Only Inference Server for RTX 5090
Minimal server focused on voice synthesis with RTX 5090 compatibility
"""

import os
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from voice_cloner import get_voice_cloner

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Request/Response models
class VoiceSynthesisRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    speed: Optional[float] = 1.0
    emotion: Optional[str] = "neutral"

class VoiceSynthesisResponse(BaseModel):
    audio_url: str
    duration: float
    voice_id: str
    generation_time: float

class VoiceStatus(BaseModel):
    tts_available: bool
    model_loaded: bool
    device: str
    voice_profiles_count: int
    gpu_available: bool
    memory_usage: Dict[str, float]
    health_status: Dict[str, Any]

class VoiceOnlyServer:
    def __init__(self):
        self.app = FastAPI(title="RTX 5090 Voice Synthesis Server")
        self.voice_cloner = None
        
        # Initialize voice cloner on startup
        self._initialize_voice_system()
        
        # Set up routes
        self._setup_routes()
    
    def _initialize_voice_system(self):
        """Initialize voice cloning system with RTX 5090 support."""
        try:
            logger.info("Initializing RTX 5090 voice synthesis system...")
            
            # Try to get voice cloner
            self.voice_cloner = get_voice_cloner()
            
            if self.voice_cloner:
                logger.info("✅ Voice synthesis system initialized successfully")
            else:
                logger.warning("⚠️ Voice cloner not available - starting without voice synthesis")
                
        except Exception as e:
            logger.error(f"Failed to initialize voice system: {e}")
            self.voice_cloner = None
    
    def _setup_routes(self):
        """Set up API routes."""
        
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "service": "voice-synthesis", "gpu": "rtx5090"}
        
        @self.app.get("/debug")
        async def debug_info():
            """Debug information about voice cloner state."""
            try:
                debug_info = {
                    "voice_cloner_available": self.voice_cloner is not None,
                    "voice_cloner_type": str(type(self.voice_cloner)) if self.voice_cloner else None
                }
                
                if self.voice_cloner:
                    # Check if voice cloner has TTS
                    debug_info["has_tts"] = hasattr(self.voice_cloner, 'tts') and self.voice_cloner.tts is not None
                    debug_info["has_model"] = hasattr(self.voice_cloner, 'model') and self.voice_cloner.model is not None
                    debug_info["voices_dir"] = str(self.voice_cloner.voices_dir) if hasattr(self.voice_cloner, 'voices_dir') else None
                    
                    # Try to list voice profiles
                    try:
                        profiles = self.voice_cloner.list_voice_profiles()
                        debug_info["profile_discovery"] = profiles
                    except Exception as e:
                        debug_info["profile_discovery_error"] = str(e)
                
                return debug_info
                
            except Exception as e:
                return {"error": str(e)}
        
        @self.app.get("/voice/status", response_model=VoiceStatus)
        async def get_voice_status():
            """Get voice synthesis system status."""
            try:
                import torch
                
                # GPU status
                gpu_available = torch.cuda.is_available()
                memory_allocated = torch.cuda.memory_allocated() / 1e9 if gpu_available else 0
                memory_reserved = torch.cuda.memory_reserved() / 1e9 if gpu_available else 0
                
                # Voice cloner status
                tts_available = self.voice_cloner is not None
                model_loaded = tts_available and hasattr(self.voice_cloner, 'tts_model')
                voice_profiles_count = 0
                
                if self.voice_cloner:
                    try:
                        profiles = self.voice_cloner.list_voice_profiles()
                        voice_profiles_count = len(profiles.get('profiles', {}).keys()) if profiles.get('success') else 0
                    except:
                        voice_profiles_count = 0
                
                return VoiceStatus(
                    tts_available=tts_available,
                    model_loaded=model_loaded,
                    device="cuda" if gpu_available else "cpu",
                    voice_profiles_count=voice_profiles_count,
                    gpu_available=gpu_available,
                    memory_usage={
                        "allocated_gb": memory_allocated,
                        "reserved_gb": memory_reserved
                    },
                    health_status={
                        "status": "healthy" if tts_available else "degraded",
                        "profiles_count": voice_profiles_count
                    }
                )
                
            except Exception as e:
                logger.error(f"Error getting voice status: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/voice/synthesize", response_model=VoiceSynthesisResponse)
        async def synthesize_voice(request: VoiceSynthesisRequest):
            """Synthesize speech from text using RTX 5090."""
            try:
                # Validate input
                if not request.text or not request.text.strip():
                    raise HTTPException(status_code=400, detail="Text is required and cannot be empty")
                
                if len(request.text) > 5000:  # Reasonable limit
                    raise HTTPException(status_code=400, detail="Text too long (maximum 5000 characters)")
                
                if not self.voice_cloner:
                    raise HTTPException(status_code=503, detail="Voice synthesis not available")
                
                import time
                start_time = time.time()
                
                # Get available voices
                profiles_result = self.voice_cloner.list_voice_profiles()
                if not profiles_result.get('success'):
                    raise HTTPException(status_code=404, detail="No voice profiles available")
                
                available_voices = list(profiles_result.get('profiles', {}).keys())
                if not available_voices:
                    raise HTTPException(status_code=404, detail="No voice profiles available")
                
                # Use requested voice or first available
                voice_id = request.voice_id or available_voices[0]
                
                if voice_id not in available_voices:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Voice '{voice_id}' not found. Available: {available_voices}"
                    )
                
                # Synthesize speech
                result = self.voice_cloner.synthesize_speech(
                    text=request.text,
                    voice_id=voice_id
                )
                
                if not result.get('success'):
                    raise HTTPException(status_code=500, detail=f"Synthesis failed: {result.get('error', 'Unknown error')}")
                
                audio_path = result['audio_path']
                
                generation_time = time.time() - start_time
                
                # Calculate audio duration (estimate)
                duration = len(request.text) * 0.05  # Rough estimate
                
                # Return relative path for web serving
                audio_url = audio_path.replace('/web/public', '').replace('/web', '')
                
                return VoiceSynthesisResponse(
                    audio_url=audio_url,
                    duration=duration,
                    voice_id=voice_id,
                    generation_time=generation_time
                )
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Voice synthesis failed: {e}")
                raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")
        
        @self.app.get("/voice/profiles")
        async def get_voice_profiles():
            """Get available voice profiles."""
            try:
                if not self.voice_cloner:
                    return {"profiles": [], "count": 0}
                
                profiles_result = self.voice_cloner.list_voice_profiles()
                if not profiles_result.get('success'):
                    return {"profiles": [], "count": 0}
                
                voices = list(profiles_result.get('profiles', {}).keys())
                return {
                    "profiles": voices,
                    "count": len(voices),
                    "default": voices[0] if voices else None
                }
                
            except Exception as e:
                logger.error(f"Error getting voice profiles: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/voice/models/refresh")
        async def refresh_voice_models():
            """Refresh voice model discovery."""
            try:
                if self.voice_cloner:
                    # Reinitialize voice cloner to discover new models
                    self.voice_cloner = get_voice_cloner()
                    if self.voice_cloner:
                        profiles_result = self.voice_cloner.list_voice_profiles()
                        voices = list(profiles_result.get('profiles', {}).keys()) if profiles_result.get('success') else []
                    else:
                        voices = []
                    return {
                        "success": True,
                        "models_found": len(voices),
                        "voices": voices
                    }
                else:
                    return {"success": False, "error": "Voice cloner not available"}
                    
            except Exception as e:
                logger.error(f"Error refreshing voice models: {e}")
                return {"success": False, "error": str(e)}
        
        @self.app.post("/voice/process")
        async def process_voice_upload():
            """Process uploaded voice files for training/inference."""
            try:
                if not self.voice_cloner:
                    raise HTTPException(status_code=503, detail="Voice cloner not available")
                
                # For now, trigger voice profile discovery
                self.voice_cloner = get_voice_cloner()
                if self.voice_cloner:
                    profiles_result = self.voice_cloner.list_voice_profiles()
                    if profiles_result.get('success'):
                        voices = list(profiles_result.get('profiles', {}).keys())
                        return {
                            "success": True,
                            "message": "Voice processing completed",
                            "profiles_found": len(voices),
                            "profiles": voices
                        }
                
                return {
                    "success": False,
                    "message": "No voice profiles found after processing"
                }
                
            except Exception as e:
                logger.error(f"Voice processing failed: {e}")
                raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

def main():
    """Start the voice-only server."""
    logger.info("🚀 Starting RTX 5090 Voice Synthesis Server...")
    
    # Initialize server
    server = VoiceOnlyServer()
    
    # Start server
    uvicorn.run(
        server.app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

if __name__ == "__main__":
    main()