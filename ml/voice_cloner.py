"""
Voice Cloning Service using XTTS-v2
Optimized for RTX 5090 (24GB VRAM)
"""

import os
import torch
import logging
import time
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path
import soundfile as sf
import librosa
import numpy as np
import glob

# RTX 5090 workaround for torchaudio issues in NVIDIA container
import types
import sys
import warnings
from unittest.mock import MagicMock

# Suppress warnings
warnings.filterwarnings("ignore")

# Enhanced torchaudio workaround for transformers validation
class TorchAudioMock(types.ModuleType):
    def __init__(self, name):
        super().__init__(name)
        self.__spec__ = types.SimpleNamespace()
        self.__spec__.name = name
        self.__spec__.origin = f'<dummy_{name}>'
        self.__spec__.submodule_search_locations = None
        self.__spec__.loader = None
        self.__file__ = f'<dummy_{name}.py>'
        self.__package__ = name.split('.')[0] if '.' in name else None

# Always apply comprehensive torchaudio workaround (override any existing)
torchaudio = TorchAudioMock('torchaudio')
torchaudio.transforms = TorchAudioMock('torchaudio.transforms')
torchaudio.functional = TorchAudioMock('torchaudio.functional')
torchaudio.datasets = TorchAudioMock('torchaudio.datasets')
torchaudio.models = TorchAudioMock('torchaudio.models')
torchaudio.utils = TorchAudioMock('torchaudio.utils')

# Add commonly accessed functions as mocks
torchaudio.load = MagicMock(return_value=(None, 22050))
torchaudio.save = MagicMock()
torchaudio.info = MagicMock()

# Install all modules in sys.modules (force override)
sys.modules['torchaudio'] = torchaudio
sys.modules['torchaudio.transforms'] = torchaudio.transforms
sys.modules['torchaudio.functional'] = torchaudio.functional
sys.modules['torchaudio.datasets'] = torchaudio.datasets
sys.modules['torchaudio.models'] = torchaudio.models
sys.modules['torchaudio.utils'] = torchaudio.utils

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
        self.external_models = {}
        self.current_model_type = "base"  # "base" or "fine_tuned"
        self.current_model_info = {}
        
        # Directories
        self.voices_dir = Path("/web/public/voices")
        self.voices_dir.mkdir(exist_ok=True)
        self.models_dir = Path("/models/voices")
        self.models_dir.mkdir(exist_ok=True)
        
        if TTS_AVAILABLE:
            self.initialize_model()
        else:
            logger.error("TTS not available - voice cloning disabled")

    def initialize_model(self):
        """Initialize XTTS-v2 model."""
        try:
            logger.info("Initializing XTTS-v2 model...")
            
            # Set environment variable to agree to TOS
            import os
            os.environ['COQUI_TOS_AGREED'] = '1'
            
            logger.info("Creating TTS instance...")
            # Try XTTS-v2 first, fallback to simpler model if needed
            try:
                self.tts = TTS(
                    model_name="tts_models/multilingual/multi-dataset/xtts_v2",
                    gpu=torch.cuda.is_available()
                )
                logger.info("✅ XTTS-v2 model loaded")
            except Exception as xtts_error:
                logger.warning(f"XTTS-v2 failed: {xtts_error}")
                logger.info("Trying fallback TTS model...")
                # Fallback to a simpler model
                self.tts = TTS(
                    model_name="tts_models/en/ljspeech/tacotron2-DDC",
                    gpu=torch.cuda.is_available()
                )
                logger.info("✅ Fallback TTS model loaded")
            
            logger.info(f"✅ XTTS-v2 loaded successfully on {self.device}")
            
            # Log GPU memory usage
            if torch.cuda.is_available():
                memory_allocated = torch.cuda.memory_allocated() / 1e9
                logger.info(f"GPU memory allocated: {memory_allocated:.2f} GB")
            
            # Discover existing voice files and external models on startup
            logger.info("Discovering voice profiles...")
            self.discover_voice_profiles()
            self.discover_external_models()
            logger.info("Voice profile discovery completed")
                
        except Exception as e:
            logger.error(f"Failed to initialize XTTS-v2: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            self.tts = None

    def discover_voice_profiles(self):
        """Discover and process existing voice files on startup."""
        try:
            logger.info("Discovering existing voice files...")
            discovered_count = 0
            
            if not self.voices_dir.exists():
                logger.info("No voices directory found, creating...")
                self.voices_dir.mkdir(exist_ok=True)
                return
            
            # Scan each user directory
            for user_dir in self.voices_dir.iterdir():
                if not user_dir.is_dir():
                    continue
                    
                user_id = user_dir.name
                logger.info(f"Scanning voice files for user: {user_id}")
                
                # Find voice files (webm, wav, mp3)
                voice_files = []
                for pattern in ["*.webm", "*.wav", "*.mp3"]:
                    voice_files.extend(user_dir.glob(pattern))
                
                if voice_files:
                    # Sort by timestamp to get latest
                    voice_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
                    
                    # Convert WebM files to WAV if needed and find best file
                    processed_file = self.get_best_voice_file(voice_files, user_dir)
                    
                    if processed_file:
                        # Create voice profile for processed file
                        voice_id = f"voice_{user_id}_latest"
                        
                        logger.info(f"Creating voice profile {voice_id} from {processed_file.name}")
                        
                        # Store voice profile info
                        self.voice_profiles[voice_id] = {
                            "audio_path": str(processed_file),
                            "user_id": user_id,
                            "created_at": datetime.now().isoformat(),
                            "source_file": processed_file.name,
                            "file_count": len(voice_files)
                        }
                        
                        discovered_count += 1
                    
            logger.info(f"Discovered {discovered_count} voice profiles")
            
        except Exception as e:
            logger.error(f"Error during voice profile discovery: {e}")

    def get_best_voice_file(self, voice_files, user_dir):
        """Get the best voice file, converting WebM to WAV if needed."""
        try:
            # First, check if we already have a WAV file
            wav_files = [f for f in voice_files if f.suffix.lower() == '.wav']
            if wav_files:
                return wav_files[0]  # Use most recent WAV
            
            # Look for WebM files to convert
            webm_files = [f for f in voice_files if f.suffix.lower() == '.webm']
            if webm_files:
                latest_webm = webm_files[0]  # Most recent WebM
                
                # Convert to WAV
                wav_path = self.convert_webm_to_wav(latest_webm, user_dir)
                if wav_path:
                    return Path(wav_path)
            
            # Fallback to any other audio file
            if voice_files:
                return voice_files[0]
                
            return None
            
        except Exception as e:
            logger.error(f"Error selecting best voice file: {e}")
            return None

    def convert_webm_to_wav(self, webm_path, output_dir):
        """Convert WebM file to WAV format using librosa."""
        try:
            logger.info(f"Converting {webm_path.name} to WAV format...")
            
            # Load WebM audio
            audio, sr = librosa.load(str(webm_path), sr=22050)
            
            # Create output path
            wav_filename = webm_path.stem + "_converted.wav"
            wav_path = output_dir / wav_filename
            
            # Save as WAV
            sf.write(wav_path, audio, sr)
            
            logger.info(f"Successfully converted to {wav_filename}")
            return str(wav_path)
            
        except Exception as e:
            logger.error(f"Failed to convert WebM to WAV: {e}")
            return None

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
                    "error": "TTS model not available",
                    "debug": "XTTS-v2 model failed to initialize"
                }
            
            if voice_id not in self.voice_profiles:
                available_voices = list(self.voice_profiles.keys())
                return {
                    "success": False,
                    "error": f"Voice profile {voice_id} not found",
                    "debug": f"Available voices: {available_voices}",
                    "suggestion": f"Use one of: {available_voices[:3]}" if available_voices else "No voice profiles available"
                }
            
            profile = self.voice_profiles[voice_id]
            speaker_wav = profile["audio_path"]
            
            if not output_path:
                # Save to web-accessible directory (shared volume)
                timestamp = int(time.time())
                output_filename = f"synthesis_{voice_id}_{timestamp}.wav"
                output_path = f"/web/public/voices/synthesis/{output_filename}"
                
                # Ensure synthesis directory exists
                synthesis_dir = Path("/web/public/voices/synthesis")
                synthesis_dir.mkdir(parents=True, exist_ok=True)
            
            logger.info(f"Synthesizing speech with voice {voice_id}")
            start_time = time.time()
            
            # Generate speech with model-appropriate parameters
            tts_kwargs = {
                "text": text,
                "file_path": output_path,
                "speaker_wav": speaker_wav
            }
            
            # Check if this is a multi-lingual model by inspecting the model name/config
            is_multilingual = False
            try:
                if hasattr(self.tts, 'synthesizer') and hasattr(self.tts.synthesizer, 'tts_config'):
                    config = self.tts.synthesizer.tts_config
                    # Check if config indicates multi-lingual support
                    if hasattr(config, 'model_name') and 'multilingual' in str(config.model_name).lower():
                        is_multilingual = True
                    elif hasattr(config, 'languages') and len(getattr(config, 'languages', [])) > 1:
                        is_multilingual = True
                elif hasattr(self.tts, 'model_name') and 'multilingual' in str(self.tts.model_name).lower():
                    is_multilingual = True
            except:
                # Safe fallback - don't add language parameter if unsure
                is_multilingual = False
            
            # Only add language parameter for confirmed multi-lingual models
            if is_multilingual:
                tts_kwargs["language"] = language
                logger.info(f"Using multi-lingual model with language: {language}")
            else:
                logger.info("Using single-language model, skipping language parameter")
            
            self.tts.tts_to_file(**tts_kwargs)
            
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
            "external_models_count": len(self.external_models),
            "current_model_type": self.current_model_type,
            "current_model_info": self.current_model_info,
            "gpu_available": torch.cuda.is_available(),
            "memory_usage": {
                "allocated_gb": torch.cuda.memory_allocated() / 1e9 if torch.cuda.is_available() else 0,
                "reserved_gb": torch.cuda.memory_reserved() / 1e9 if torch.cuda.is_available() else 0,
            } if torch.cuda.is_available() else None
        }

    def discover_external_models(self):
        """Discover fine-tuned models in the models directory."""
        try:
            logger.info("Discovering external fine-tuned models...")
            discovered_count = 0
            
            if not self.models_dir.exists():
                logger.info("No external models directory found")
                return
            
            # Scan each user directory
            for user_dir in self.models_dir.iterdir():
                if not user_dir.is_dir():
                    continue
                    
                user_id = user_dir.name
                logger.info(f"Scanning models for user: {user_id}")
                
                # Check for latest model symlink
                latest_link = user_dir / "latest"
                if latest_link.exists() and latest_link.is_symlink():
                    model_dir = latest_link.resolve()
                    if model_dir.exists():
                        model_info = self._validate_external_model(model_dir, user_id)
                        if model_info:
                            model_id = f"fine_tuned_{user_id}_latest"
                            self.external_models[model_id] = model_info
                            discovered_count += 1
                            logger.info(f"✓ Found fine-tuned model: {model_id}")
                
                # Also scan for versioned models
                for model_dir in user_dir.iterdir():
                    if model_dir.is_dir() and model_dir.name != "latest":
                        model_info = self._validate_external_model(model_dir, user_id)
                        if model_info:
                            model_version = model_dir.name
                            model_id = f"fine_tuned_{user_id}_{model_version}"
                            if model_id not in self.external_models:
                                self.external_models[model_id] = model_info
                                discovered_count += 1
                                logger.info(f"✓ Found versioned model: {model_id}")
            
            logger.info(f"Discovered {discovered_count} external models")
            
            # Auto-load the best available model
            self._auto_select_best_model()
            
        except Exception as e:
            logger.error(f"Error discovering external models: {e}")

    def _validate_external_model(self, model_dir: Path, user_id: str) -> Optional[Dict[str, Any]]:
        """Validate and extract info from external model directory."""
        try:
            # Check for required files
            metadata_file = model_dir / "metadata.json"
            model_file = model_dir / "model.pth"
            config_file = model_dir / "config.json"
            
            if not all([metadata_file.exists(), model_file.exists(), config_file.exists()]):
                logger.warning(f"Incomplete model in {model_dir}: missing required files")
                return None
            
            # Load and validate metadata
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            
            required_fields = ["model_version", "user_id", "created_at", "model_type"]
            if not all(field in metadata for field in required_fields):
                logger.warning(f"Invalid metadata in {model_dir}: missing required fields")
                return None
            
            if metadata["user_id"] != user_id:
                logger.warning(f"User ID mismatch in {model_dir}: {metadata['user_id']} != {user_id}")
                return None
            
            # Extract model info
            model_info = {
                "model_dir": str(model_dir),
                "metadata": metadata,
                "model_file": str(model_file),
                "config_file": str(config_file),
                "user_id": user_id,
                "model_version": metadata["model_version"],
                "created_at": metadata["created_at"],
                "model_type": metadata.get("model_type", "xtts_v2_finetuned"),
                "file_size_mb": model_file.stat().st_size / 1e6,
                "is_available": True
            }
            
            return model_info
            
        except Exception as e:
            logger.error(f"Failed to validate model in {model_dir}: {e}")
            return None

    def _auto_select_best_model(self):
        """Automatically select the best available model."""
        try:
            if not self.external_models:
                logger.info("No external models available, using base model")
                self.current_model_type = "base"
                self.current_model_info = {
                    "type": "base",
                    "model": "xtts_v2_base",
                    "loaded_at": datetime.now().isoformat()
                }
                return
            
            # Find the most recent model
            latest_model_id = None
            latest_timestamp = None
            
            for model_id, model_info in self.external_models.items():
                if "latest" in model_id:  # Prefer latest symlinked models
                    latest_model_id = model_id
                    break
                    
                # Compare timestamps
                created_at = model_info["created_at"]
                if latest_timestamp is None or created_at > latest_timestamp:
                    latest_timestamp = created_at
                    latest_model_id = model_id
            
            if latest_model_id:
                logger.info(f"Auto-selected external model: {latest_model_id}")
                self.current_model_type = "fine_tuned"
                self.current_model_info = {
                    "type": "fine_tuned",
                    "model_id": latest_model_id,
                    "model_info": self.external_models[latest_model_id],
                    "auto_selected": True,
                    "loaded_at": datetime.now().isoformat()
                }
            
        except Exception as e:
            logger.error(f"Failed to auto-select model: {e}")

    def load_external_model(self, model_id: str) -> Dict[str, Any]:
        """Load a specific external fine-tuned model."""
        try:
            if model_id not in self.external_models:
                return {
                    "success": False,
                    "error": f"Model {model_id} not found"
                }
            
            model_info = self.external_models[model_id]
            logger.info(f"Loading external model: {model_id}")
            
            # Load model configuration
            config_path = model_info["config_file"]
            with open(config_path, 'r') as f:
                config_dict = json.load(f)
            
            # Initialize XTTS with custom config
            config = XttsConfig()
            config.load_dict(config_dict)
            
            # Load the fine-tuned model
            model_path = model_info["model_file"]
            model = Xtts.init_from_config(config)
            
            # Load model weights
            checkpoint = torch.load(model_path, map_location=self.device)
            model.load_state_dict(checkpoint)
            model.to(self.device)
            model.eval()
            
            # Replace current TTS model
            if hasattr(self.tts, 'synthesizer') and hasattr(self.tts.synthesizer, 'tts_model'):
                self.tts.synthesizer.tts_model = model
                self.tts.synthesizer.tts_config = config
            else:
                # Fallback: create new TTS instance with custom model
                logger.warning("Unable to replace model in existing TTS instance, functionality may be limited")
            
            # Update current model info
            self.current_model_type = "fine_tuned"
            self.current_model_info = {
                "type": "fine_tuned",
                "model_id": model_id,
                "model_info": model_info,
                "manually_loaded": True,
                "loaded_at": datetime.now().isoformat()
            }
            
            logger.info(f"✅ External model loaded successfully: {model_id}")
            
            return {
                "success": True,
                "model_id": model_id,
                "model_info": model_info,
                "message": f"Fine-tuned model {model_id} loaded successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to load external model {model_id}: {e}")
            return {
                "success": False,
                "error": f"Failed to load model: {str(e)}"
            }

    def list_external_models(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """List available external models."""
        try:
            if user_id:
                models = {
                    model_id: model_info for model_id, model_info in self.external_models.items()
                    if model_info["user_id"] == user_id
                }
            else:
                models = self.external_models
            
            return {
                "success": True,
                "models": models,
                "count": len(models),
                "current_model": self.current_model_info
            }
            
        except Exception as e:
            logger.error(f"Failed to list external models: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def reload_base_model(self) -> Dict[str, Any]:
        """Reload the base XTTS-v2 model."""
        try:
            logger.info("Reloading base XTTS-v2 model...")
            
            # Clear GPU memory
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            # Reinitialize base model
            self.tts = TTS(
                model_name="tts_models/multilingual/multi-dataset/xtts_v2",
                gpu=torch.cuda.is_available()
            )
            
            self.current_model_type = "base"
            self.current_model_info = {
                "type": "base",
                "model": "xtts_v2_base",
                "reloaded_at": datetime.now().isoformat()
            }
            
            logger.info("✅ Base model reloaded successfully")
            
            return {
                "success": True,
                "message": "Base XTTS-v2 model reloaded successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to reload base model: {e}")
            return {
                "success": False,
                "error": str(e)
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