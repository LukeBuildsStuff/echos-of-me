"""
Voice Cloning Service using XTTS-v2
Optimized for RTX 5090 (24GB VRAM)
"""

import os
import torch
import logging
import time
from typing import Optional, Dict, Any
from pathlib import Path
import soundfile as sf
import librosa
import numpy as np

try:
    from TTS.api import TTS
    from TTS.tts.configs.xtts_config import XttsConfig
    from TTS.tts.models.xtts import Xtts
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False
    logging.warning("TTS library not available. Voice cloning features disabled.")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VoiceCloner:
    def __init__(self):
        """Initialize Voice Cloner with XTTS-v2."""
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tts = None
        self.model = None
        self.config = None
        self.voice_profiles = {}
        
        # Directories
        self.voices_dir = Path("/models/voices")
        self.voices_dir.mkdir(exist_ok=True)
        
        if TTS_AVAILABLE:
            self.initialize_model()
        else:
            logger.error("TTS not available - voice cloning disabled")

    def initialize_model(self):
        """Initialize XTTS-v2 model."""
        try:
            logger.info("Initializing XTTS-v2 model...")
            
            # Initialize TTS with XTTS-v2
            self.tts = TTS(
                model_name="tts_models/multilingual/multi-dataset/xtts_v2",
                gpu=torch.cuda.is_available()
            )
            
            logger.info(f"XTTS-v2 loaded successfully on {self.device}")
            
            # Log GPU memory usage
            if torch.cuda.is_available():
                memory_allocated = torch.cuda.memory_allocated() / 1e9
                logger.info(f"GPU memory allocated: {memory_allocated:.2f} GB")
                
        except Exception as e:
            logger.error(f"Failed to initialize XTTS-v2: {e}")
            self.tts = None

    def process_voice_recording(
        self, 
        audio_path: str, 
        voice_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """Process uploaded voice recording for cloning."""
        try:
            logger.info(f"Processing voice recording: {voice_id}")
            
            if not self.tts:
                return {
                    "success": False,
                    "error": "TTS model not available",
                    "voice_id": voice_id
                }
            
            # Validate audio file
            if not os.path.exists(audio_path):
                return {
                    "success": False,
                    "error": "Audio file not found",
                    "voice_id": voice_id
                }
            
            # Load and validate audio
            audio_info = self.validate_audio(audio_path)
            if not audio_info["valid"]:
                return {
                    "success": False,
                    "error": audio_info["error"],
                    "voice_id": voice_id
                }
            
            # Create voice profile directory
            profile_dir = self.voices_dir / user_id
            profile_dir.mkdir(exist_ok=True)
            
            # Convert audio to suitable format for XTTS
            processed_audio_path = self.preprocess_audio(audio_path, profile_dir, voice_id)
            
            # Store voice profile metadata
            self.voice_profiles[voice_id] = {
                "user_id": user_id,
                "audio_path": processed_audio_path,
                "created_at": time.time(),
                "duration": audio_info["duration"],
                "sample_rate": audio_info["sample_rate"]
            }
            
            logger.info(f"Voice profile created successfully: {voice_id}")
            
            return {
                "success": True,
                "voice_id": voice_id,
                "audio_path": processed_audio_path,
                "duration": audio_info["duration"],
                "message": "Voice cloned successfully"
            }
            
        except Exception as e:
            logger.error(f"Voice processing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "voice_id": voice_id
            }

    def validate_audio(self, audio_path: str) -> Dict[str, Any]:
        """Validate audio file for voice cloning."""
        try:
            # Load audio
            audio, sr = librosa.load(audio_path, sr=None)
            duration = len(audio) / sr
            
            # Validation checks
            if duration < 6.0:  # XTTS requires at least 6 seconds
                return {
                    "valid": False,
                    "error": f"Audio too short: {duration:.1f}s (minimum 6s required)"
                }
            
            if duration > 300.0:  # Limit to 5 minutes
                return {
                    "valid": False,
                    "error": f"Audio too long: {duration:.1f}s (maximum 300s allowed)"
                }
            
            # Check for silence
            rms = librosa.feature.rms(y=audio)[0]
            if np.mean(rms) < 0.01:  # Very quiet audio
                return {
                    "valid": False,
                    "error": "Audio appears to be too quiet or silent"
                }
            
            return {
                "valid": True,
                "duration": duration,
                "sample_rate": sr,
                "rms_level": float(np.mean(rms))
            }
            
        except Exception as e:
            return {
                "valid": False,
                "error": f"Audio validation failed: {str(e)}"
            }

    def preprocess_audio(self, input_path: str, output_dir: Path, voice_id: str) -> str:
        """Preprocess audio for XTTS-v2."""
        try:
            # Load audio
            audio, sr = librosa.load(input_path, sr=22050)  # XTTS prefers 22kHz
            
            # Normalize audio
            audio = librosa.util.normalize(audio)
            
            # Remove silence from beginning and end
            audio, _ = librosa.effects.trim(audio, top_db=20)
            
            # Save processed audio
            output_path = output_dir / f"{voice_id}_processed.wav"
            sf.write(output_path, audio, sr)
            
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Audio preprocessing failed: {e}")
            return input_path  # Return original if preprocessing fails

    def synthesize_speech(
        self, 
        text: str, 
        voice_id: str, 
        output_path: Optional[str] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """Synthesize speech using cloned voice."""
        try:
            if not self.tts:
                return {
                    "success": False,
                    "error": "TTS model not available"
                }
            
            if voice_id not in self.voice_profiles:
                return {
                    "success": False,
                    "error": f"Voice profile {voice_id} not found"
                }
            
            profile = self.voice_profiles[voice_id]
            speaker_wav = profile["audio_path"]
            
            if not output_path:
                output_path = f"/tmp/synthesis_{voice_id}_{int(time.time())}.wav"
            
            logger.info(f"Synthesizing speech with voice {voice_id}")
            start_time = time.time()
            
            # Generate speech
            self.tts.tts_to_file(
                text=text,
                file_path=output_path,
                speaker_wav=speaker_wav,
                language=language
            )
            
            generation_time = time.time() - start_time
            logger.info(f"Speech synthesis completed in {generation_time:.2f}s")
            
            return {
                "success": True,
                "audio_path": output_path,
                "generation_time": generation_time,
                "voice_id": voice_id,
                "text_length": len(text)
            }
            
        except Exception as e:
            logger.error(f"Speech synthesis failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def list_voice_profiles(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """List available voice profiles."""
        if user_id:
            profiles = {
                vid: profile for vid, profile in self.voice_profiles.items()
                if profile["user_id"] == user_id
            }
        else:
            profiles = self.voice_profiles
        
        return {
            "success": True,
            "profiles": profiles,
            "count": len(profiles)
        }

    def delete_voice_profile(self, voice_id: str, user_id: str) -> Dict[str, Any]:
        """Delete a voice profile."""
        try:
            if voice_id not in self.voice_profiles:
                return {
                    "success": False,
                    "error": "Voice profile not found"
                }
            
            profile = self.voice_profiles[voice_id]
            
            # Verify ownership
            if profile["user_id"] != user_id:
                return {
                    "success": False,
                    "error": "Unauthorized to delete this voice profile"
                }
            
            # Delete audio file
            audio_path = profile["audio_path"]
            if os.path.exists(audio_path):
                os.remove(audio_path)
            
            # Remove from profiles
            del self.voice_profiles[voice_id]
            
            return {
                "success": True,
                "message": f"Voice profile {voice_id} deleted successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to delete voice profile: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def get_model_status(self) -> Dict[str, Any]:
        """Get voice cloning model status."""
        return {
            "tts_available": TTS_AVAILABLE,
            "model_loaded": self.tts is not None,
            "device": str(self.device),
            "voice_profiles_count": len(self.voice_profiles),
            "gpu_available": torch.cuda.is_available(),
            "memory_usage": {
                "allocated_gb": torch.cuda.memory_allocated() / 1e9 if torch.cuda.is_available() else 0,
                "reserved_gb": torch.cuda.memory_reserved() / 1e9 if torch.cuda.is_available() else 0,
            } if torch.cuda.is_available() else None
        }

# Global voice cloner instance
voice_cloner = None

def get_voice_cloner() -> VoiceCloner:
    """Get or create voice cloner instance."""
    global voice_cloner
    if voice_cloner is None:
        voice_cloner = VoiceCloner()
    return voice_cloner

def main():
    """Test the voice cloner."""
    cloner = VoiceCloner()
    status = cloner.get_model_status()
    
    print("Voice Cloner Status:")
    for key, value in status.items():
        print(f"  {key}: {value}")

if __name__ == "__main__":
    main()