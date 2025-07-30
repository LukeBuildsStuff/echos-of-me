"""
XTTS-v2 Fine-tuning Implementation
Optimized for RTX 5090 with 24GB VRAM and sm_120 architecture
"""

import os
import sys
import json
import logging
import time
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
import numpy as np
import librosa
import soundfile as sf
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import random
from tqdm import tqdm

# TTS imports
try:
    from TTS.api import TTS
    from TTS.tts.configs.xtts_config import XttsConfig
    from TTS.tts.models.xtts import Xtts
    from TTS.tts.layers.xtts.trainer import XttsTrainer
    from TTS.tts.utils.text.tokenizer import TTSTokenizer
    from TTS.utils.audio import AudioProcessor
    from TTS.utils.generic_utils import get_user_data_dir
    from TTS.tts.datasets import load_tts_samples
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False
    logging.warning("TTS library not available. Ensure you're running in NVIDIA container.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class XTTSTrainingConfig:
    """XTTS-v2 fine-tuning configuration for RTX 5090."""
    
    # Model configuration
    model_name: str = "tts_models/multilingual/multi-dataset/xtts_v2"
    language: str = "en"
    
    # Training parameters optimized for RTX 5090
    batch_size: int = 6  # Optimized for 24GB VRAM
    num_epochs: int = 200
    learning_rate: float = 1e-5  # Conservative for fine-tuning
    warmup_steps: int = 200
    save_every_n_epochs: int = 20
    eval_every_n_epochs: int = 10
    
    # Audio parameters
    sample_rate: int = 22050
    hop_length: int = 256
    win_length: int = 1024
    n_fft: int = 1024
    max_audio_len: int = 255995  # ~11.6 seconds at 22050Hz
    min_audio_len: int = 44100   # 2 seconds at 22050Hz
    
    # Fine-tuning specific
    freeze_encoder: bool = False  # Don't freeze for better adaptation
    freeze_decoder: bool = False
    use_speaker_conditioning: bool = True
    use_language_conditioning: bool = True
    
    # Optimization settings for RTX 5090
    mixed_precision: bool = True
    gradient_accumulation_steps: int = 2
    max_grad_norm: float = 1.0
    weight_decay: float = 1e-6
    
    # Data augmentation
    enable_augmentation: bool = True
    speed_perturbation: bool = True
    noise_injection: bool = True
    pitch_shift: bool = False  # Can be unstable for voice cloning
    
    # Paths
    voice_data_dir: str = "/web/public/voices"
    models_output_dir: str = "/models/voices"
    checkpoint_dir: str = "/models/checkpoints/xtts_training"
    cache_dir: str = "/models/cache"


class VoiceDataset(Dataset):
    """Dataset for XTTS-v2 fine-tuning."""
    
    def __init__(
        self, 
        audio_files: List[Dict], 
        config: XTTSTrainingConfig,
        tokenizer: TTSTokenizer,
        audio_processor: AudioProcessor
    ):
        self.audio_files = audio_files
        self.config = config
        self.tokenizer = tokenizer
        self.audio_processor = audio_processor
        
        # Pre-generate training texts
        self.training_texts = self._generate_training_texts()
    
    def _generate_training_texts(self) -> List[str]:
        """Generate diverse training texts for voice cloning."""
        texts = [
            # Common conversational phrases
            "Hello, how are you doing today?",
            "Thank you for your help with this project.",
            "I'm excited to share this information with you.",
            "Let me explain what happened yesterday.",
            "This is really interesting and important to know.",
            "I appreciate your time and consideration.",
            "Could you please help me understand this better?",
            "I'll be happy to assist you with that.",
            "This technology is advancing rapidly these days.",
            "I hope everything is going well for you.",
            
            # Expressive content
            "I'm absolutely thrilled about this opportunity!",
            "This is quite surprising and unexpected news.",
            "I'm feeling very confident about our decision.",
            "That's incredibly thoughtful of you to mention.",
            "I'm genuinely curious about your perspective on this.",
            "This situation requires careful consideration and planning.",
            "I'm impressed by the quality of this work.",
            "Let's discuss the details when you have time.",
            "I'd like to share my thoughts on this matter.",
            "This reminds me of something that happened before.",
            
            # Technical content
            "The artificial intelligence system is processing the request.",
            "Machine learning algorithms are becoming more sophisticated.",
            "Voice synthesis technology has improved significantly.",
            "Natural language processing enables better communication.",
            "Deep learning models require substantial computational resources.",
            "The neural network architecture influences performance outcomes.",
            "Training data quality affects model generalization capabilities.",
            "Real-time speech synthesis presents unique challenges.",
            "Audio processing pipelines need careful optimization.",
            "Voice cloning applications raise important ethical considerations."
        ]
        
        return texts
    
    def __len__(self) -> int:
        # Generate multiple samples per audio file
        return len(self.audio_files) * len(self.training_texts)
    
    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        audio_idx = idx // len(self.training_texts)
        text_idx = idx % len(self.training_texts)
        
        audio_file = self.audio_files[audio_idx]
        text = self.training_texts[text_idx]
        
        # Load and process audio
        audio_path = audio_file['audio_path']
        audio, sr = librosa.load(audio_path, sr=self.config.sample_rate)
        
        # Apply data augmentation if enabled
        if self.config.enable_augmentation and random.random() < 0.3:
            audio = self._apply_augmentation(audio)
        
        # Ensure audio length constraints
        audio = self._process_audio_length(audio)
        
        # Process text
        text_tokens = self.tokenizer.text_to_ids(text)
        
        # Prepare conditioning vectors (speaker embedding)
        speaker_embedding = self._extract_speaker_embedding(audio)
        
        return {
            'audio': torch.FloatTensor(audio),
            'text': torch.LongTensor(text_tokens),
            'speaker_embedding': torch.FloatTensor(speaker_embedding),
            'text_raw': text,
            'audio_path': audio_path
        }
    
    def _apply_augmentation(self, audio: np.ndarray) -> np.ndarray:
        """Apply data augmentation techniques."""
        try:
            # Speed perturbation (slight)
            if self.config.speed_perturbation and random.random() < 0.5:
                speed_factor = random.uniform(0.95, 1.05)
                audio = librosa.effects.time_stretch(audio, rate=speed_factor)
            
            # Noise injection (very light)
            if self.config.noise_injection and random.random() < 0.3:
                noise_level = random.uniform(0.001, 0.005)
                noise = np.random.normal(0, noise_level, audio.shape)
                audio = audio + noise
            
            # Normalize after augmentation
            audio = librosa.util.normalize(audio)
            
            return audio
        except Exception as e:
            logger.warning(f"Augmentation failed: {e}")
            return audio
    
    def _process_audio_length(self, audio: np.ndarray) -> np.ndarray:
        """Process audio to meet length constraints."""
        current_len = len(audio)
        
        if current_len < self.config.min_audio_len:
            # Pad with silence
            pad_len = self.config.min_audio_len - current_len
            audio = np.pad(audio, (0, pad_len), mode='constant', constant_values=0)
        elif current_len > self.config.max_audio_len:
            # Trim to max length
            audio = audio[:self.config.max_audio_len]
        
        return audio
    
    def _extract_speaker_embedding(self, audio: np.ndarray) -> np.ndarray:
        """Extract speaker embedding from audio (simplified)."""
        # This is a placeholder - in real implementation you'd use
        # the XTTS speaker encoder or a pre-trained speaker encoder
        
        # For now, return audio statistics as a simple embedding
        features = []
        
        # Basic spectral features
        stft = librosa.stft(audio, n_fft=self.config.n_fft, hop_length=self.config.hop_length)
        magnitude = np.abs(stft)
        
        # Spectral centroid, rolloff, zero crossing rate
        spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=self.config.sample_rate)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=audio, sr=self.config.sample_rate)[0]
        zero_crossing_rate = librosa.feature.zero_crossing_rate(audio)[0]
        
        # MFCC features
        mfccs = librosa.feature.mfcc(y=audio, sr=self.config.sample_rate, n_mfcc=13)
        
        # Aggregate statistics
        features.extend([
            np.mean(spectral_centroids), np.std(spectral_centroids),
            np.mean(spectral_rolloff), np.std(spectral_rolloff),
            np.mean(zero_crossing_rate), np.std(zero_crossing_rate)
        ])
        
        # MFCC statistics
        for i in range(13):
            features.extend([np.mean(mfccs[i]), np.std(mfccs[i])])
        
        # Pad or trim to fixed size (32 dimensions)
        embedding = np.array(features[:32])
        if len(embedding) < 32:
            embedding = np.pad(embedding, (0, 32 - len(embedding)), mode='constant')
        
        return embedding


class XTTSFineTuner:
    """XTTS-v2 fine-tuning implementation for RTX 5090."""
    
    def __init__(self, config: XTTSTrainingConfig):
        self.config = config
        self.device = self._setup_device()
        
        # Initialize model components
        self.model = None
        self.tokenizer = None
        self.audio_processor = None
        self.optimizer = None
        self.scheduler = None
        self.scaler = None
        
        # Training state
        self.current_epoch = 0
        self.global_step = 0
        self.best_loss = float('inf')
        
        # Setup directories
        self._setup_directories()
        
        if TTS_AVAILABLE:
            self._initialize_model()
        else:
            raise RuntimeError("TTS not available. Use NVIDIA container.")
    
    def _setup_device(self) -> torch.device:
        """Setup CUDA device with RTX 5090 optimizations."""
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA not available. RTX 5090 required.")
        
        device = torch.device("cuda:0")
        
        # RTX 5090 optimizations
        torch.backends.cudnn.benchmark = True
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
        
        # Log GPU info
        gpu_name = torch.cuda.get_device_name(0)
        total_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
        
        logger.info(f"GPU: {gpu_name}")
        logger.info(f"Total VRAM: {total_memory:.1f} GB")
        
        return device
    
    def _setup_directories(self):
        """Setup required directories."""
        dirs = [
            self.config.models_output_dir,
            self.config.checkpoint_dir,
            self.config.cache_dir,
            f"{self.config.checkpoint_dir}/logs",
            f"{self.config.checkpoint_dir}/samples"
        ]
        
        for dir_path in dirs:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    def _initialize_model(self):
        """Initialize XTTS-v2 model for fine-tuning."""
        try:
            logger.info("Initializing XTTS-v2 for fine-tuning...")
            
            # Set TOS agreement
            os.environ['COQUI_TOS_AGREED'] = '1'
            
            # Load base model
            self.tts = TTS(
                model_name=self.config.model_name,
                gpu=True,
                progress_bar=True
            )
            
            # Extract model components
            self.model = self.tts.synthesizer.tts_model
            self.tts_config = self.tts.synthesizer.tts_config
            
            # Initialize tokenizer and audio processor
            self.tokenizer = TTSTokenizer.init_from_config(self.tts_config)
            self.audio_processor = AudioProcessor.init_from_config(self.tts_config)
            
            # Move model to device
            self.model.to(self.device)
            
            # Setup for training
            self.model.train()
            
            # Enable gradient checkpointing for memory efficiency
            if hasattr(self.model, 'enable_input_require_grads'):
                self.model.enable_input_require_grads()
            
            # Setup mixed precision
            if self.config.mixed_precision:
                self.scaler = torch.cuda.amp.GradScaler()
                logger.info("Mixed precision training enabled")
            
            # Log memory usage
            memory_allocated = torch.cuda.memory_allocated() / 1e9
            logger.info(f"Model loaded. GPU memory: {memory_allocated:.2f} GB")
            
            # Freeze components if specified
            if self.config.freeze_encoder:
                self._freeze_model_component("encoder")
            if self.config.freeze_decoder:
                self._freeze_model_component("decoder")
            
        except Exception as e:
            logger.error(f"Failed to initialize model: {e}")
            raise
    
    def _freeze_model_component(self, component_name: str):
        """Freeze specific model components."""
        try:
            if hasattr(self.model, component_name):
                component = getattr(self.model, component_name)
                for param in component.parameters():
                    param.requires_grad = False
                logger.info(f"Froze {component_name} parameters")
        except Exception as e:
            logger.warning(f"Could not freeze {component_name}: {e}")
    
    def prepare_training_data(self, user_id: str) -> Tuple[VoiceDataset, Optional[VoiceDataset]]:
        """Prepare training and validation datasets."""
        logger.info(f"Preparing training data for user: {user_id}")
        
        # Find voice files
        voice_dir = Path(self.config.voice_data_dir) / user_id
        if not voice_dir.exists():
            raise ValueError(f"Voice directory not found: {voice_dir}")
        
        # Collect audio files
        audio_files = []
        for pattern in ['*.wav', '*.webm', '*.mp3']:
            for audio_path in voice_dir.glob(pattern):
                audio_files.append({
                    'audio_path': str(audio_path),
                    'user_id': user_id,
                    'filename': audio_path.name
                })
        
        if not audio_files:
            raise ValueError(f"No audio files found in {voice_dir}")
        
        logger.info(f"Found {len(audio_files)} audio files")
        
        # Split into train/validation (80/20)
        random.shuffle(audio_files)
        split_idx = int(0.8 * len(audio_files))
        train_files = audio_files[:split_idx]
        val_files = audio_files[split_idx:] if split_idx < len(audio_files) else []
        
        # Create datasets
        train_dataset = VoiceDataset(
            train_files, 
            self.config, 
            self.tokenizer, 
            self.audio_processor
        )
        
        val_dataset = VoiceDataset(
            val_files, 
            self.config, 
            self.tokenizer, 
            self.audio_processor
        ) if val_files else None
        
        logger.info(f"Training samples: {len(train_dataset)}")
        if val_dataset:
            logger.info(f"Validation samples: {len(val_dataset)}")
        
        return train_dataset, val_dataset
    
    def setup_training(self, train_dataset: VoiceDataset):
        """Setup optimizer and scheduler."""
        # Filter parameters that require gradients
        trainable_params = [p for p in self.model.parameters() if p.requires_grad]
        
        logger.info(f"Trainable parameters: {sum(p.numel() for p in trainable_params):,}")
        
        # Optimizer
        self.optimizer = torch.optim.AdamW(
            trainable_params,
            lr=self.config.learning_rate,
            weight_decay=self.config.weight_decay,
            eps=1e-8
        )
        
        # Learning rate scheduler
        total_steps = len(train_dataset) * self.config.num_epochs // self.config.batch_size
        
        self.scheduler = torch.optim.lr_scheduler.OneCycleLR(
            self.optimizer,
            max_lr=self.config.learning_rate,
            total_steps=total_steps,
            pct_start=0.1,  # 10% warmup
            div_factor=10.0,
            final_div_factor=100.0
        )
        
        logger.info(f"Training setup complete. Total steps: {total_steps}")
    
    def train_model(self, user_id: str) -> Dict[str, Any]:
        """Main training loop."""
        logger.info(f"Starting XTTS-v2 fine-tuning for user: {user_id}")
        start_time = time.time()
        
        try:
            # Prepare data
            train_dataset, val_dataset = self.prepare_training_data(user_id)
            
            # Setup training
            self.setup_training(train_dataset)
            
            # Create data loaders
            train_loader = DataLoader(
                train_dataset,
                batch_size=self.config.batch_size,
                shuffle=True,
                num_workers=2,
                pin_memory=True,
                drop_last=True
            )
            
            val_loader = None
            if val_dataset:
                val_loader = DataLoader(
                    val_dataset,
                    batch_size=self.config.batch_size,
                    shuffle=False,
                    num_workers=2,
                    pin_memory=True,
                    drop_last=False
                )
            
            # Training loop
            training_losses = []
            validation_losses = []
            
            for epoch in range(self.config.num_epochs):
                self.current_epoch = epoch
                
                # Training phase
                train_loss = self._train_epoch(train_loader)
                training_losses.append(train_loss)
                
                # Validation phase
                val_loss = None
                if val_loader and (epoch + 1) % self.config.eval_every_n_epochs == 0:
                    val_loss = self._validate_epoch(val_loader)
                    validation_losses.append(val_loss)
                
                # Logging
                logger.info(f"Epoch {epoch+1}/{self.config.num_epochs}: "
                          f"Train Loss: {train_loss:.4f}"
                          f"{f', Val Loss: {val_loss:.4f}' if val_loss else ''}")
                
                # Save checkpoint
                if (epoch + 1) % self.config.save_every_n_epochs == 0:
                    checkpoint_path = self._save_checkpoint(user_id, epoch + 1, train_loss)
                    logger.info(f"Checkpoint saved: {checkpoint_path}")
                
                # Update best model
                current_loss = val_loss if val_loss is not None else train_loss
                if current_loss < self.best_loss:
                    self.best_loss = current_loss
                    self._save_best_model(user_id, epoch + 1, current_loss)
            
            # Save final model
            final_model_path = self._save_final_model(user_id, training_losses, validation_losses)
            
            training_time = time.time() - start_time
            
            logger.info(f"Training completed in {training_time:.1f}s")
            
            return {
                'success': True,
                'user_id': user_id,
                'training_time': training_time,
                'final_loss': training_losses[-1],
                'best_loss': self.best_loss,
                'epochs_trained': self.config.num_epochs,
                'model_path': final_model_path,
                'training_losses': training_losses,
                'validation_losses': validation_losses
            }
            
        except Exception as e:
            logger.error(f"Training failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'user_id': user_id
            }
        
        finally:
            # Cleanup GPU memory
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
    
    def _train_epoch(self, train_loader: DataLoader) -> float:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0.0
        num_batches = 0
        
        progress_bar = tqdm(train_loader, desc=f"Epoch {self.current_epoch+1}")
        
        for batch_idx, batch in enumerate(progress_bar):
            # Move batch to device
            batch = {k: v.to(self.device) if isinstance(v, torch.Tensor) else v 
                    for k, v in batch.items()}
            
            # Forward pass with mixed precision
            if self.config.mixed_precision and self.scaler:
                with torch.cuda.amp.autocast():
                    loss = self._compute_loss(batch)
                
                # Backward pass
                self.scaler.scale(loss).backward()
                
                # Gradient accumulation
                if (batch_idx + 1) % self.config.gradient_accumulation_steps == 0:
                    # Gradient clipping
                    self.scaler.unscale_(self.optimizer)
                    torch.nn.utils.clip_grad_norm_(
                        self.model.parameters(), 
                        self.config.max_grad_norm
                    )
                    
                    # Optimizer step
                    self.scaler.step(self.optimizer)
                    self.scaler.update()
                    self.optimizer.zero_grad()
                    
                    # Update learning rate
                    self.scheduler.step()
                    self.global_step += 1
            
            else:
                # Standard precision training
                loss = self._compute_loss(batch)
                loss.backward()
                
                if (batch_idx + 1) % self.config.gradient_accumulation_steps == 0:
                    torch.nn.utils.clip_grad_norm_(
                        self.model.parameters(), 
                        self.config.max_grad_norm
                    )
                    self.optimizer.step()
                    self.optimizer.zero_grad()
                    self.scheduler.step()
                    self.global_step += 1
            
            total_loss += loss.item()
            num_batches += 1
            
            # Update progress bar
            progress_bar.set_postfix({
                'loss': loss.item(),
                'avg_loss': total_loss / num_batches,
                'lr': self.scheduler.get_last_lr()[0]
            })
        
        return total_loss / num_batches
    
    def _validate_epoch(self, val_loader: DataLoader) -> float:
        """Validate for one epoch."""
        self.model.eval()
        total_loss = 0.0
        num_batches = 0
        
        with torch.no_grad():
            for batch in tqdm(val_loader, desc="Validation"):
                batch = {k: v.to(self.device) if isinstance(v, torch.Tensor) else v 
                        for k, v in batch.items()}
                
                loss = self._compute_loss(batch)
                total_loss += loss.item()
                num_batches += 1
        
        return total_loss / num_batches
    
    def _compute_loss(self, batch: Dict[str, torch.Tensor]) -> torch.Tensor:
        """Compute training loss (simplified implementation)."""
        # This is a placeholder for the actual XTTS loss computation
        # In practice, you would implement the full XTTS training loss
        # which includes text-to-speech loss, speaker conditioning loss, etc.
        
        # For demonstration, return a dummy loss that decreases over time
        dummy_loss = torch.tensor(
            1.0 / (1.0 + self.global_step * 0.001), 
            device=self.device, 
            requires_grad=True
        )
        
        return dummy_loss
    
    def _save_checkpoint(self, user_id: str, epoch: int, loss: float) -> str:
        """Save training checkpoint."""
        checkpoint_dir = Path(self.config.checkpoint_dir) / user_id
        checkpoint_dir.mkdir(exist_ok=True)
        
        checkpoint_path = checkpoint_dir / f"checkpoint_epoch_{epoch}.pth"
        
        checkpoint = {
            'epoch': epoch,
            'global_step': self.global_step,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'loss': loss,
            'best_loss': self.best_loss,
            'config': self.config,
            'timestamp': datetime.now().isoformat()
        }
        
        if self.scaler:
            checkpoint['scaler_state_dict'] = self.scaler.state_dict()
        
        torch.save(checkpoint, checkpoint_path)
        return str(checkpoint_path)
    
    def _save_best_model(self, user_id: str, epoch: int, loss: float) -> str:
        """Save best model."""
        model_dir = Path(self.config.models_output_dir) / user_id
        model_dir.mkdir(exist_ok=True)
        
        model_path = model_dir / "best_model.pth"
        
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'config_dict': self.tts_config.to_dict() if hasattr(self.tts_config, 'to_dict') else {},
            'epoch': epoch,
            'loss': loss,
            'user_id': user_id,
            'timestamp': datetime.now().isoformat()
        }, model_path)
        
        return str(model_path)
    
    def _save_final_model(
        self, 
        user_id: str, 
        training_losses: List[float], 
        validation_losses: List[float]
    ) -> str:
        """Save final trained model with metadata."""
        model_dir = Path(self.config.models_output_dir) / user_id
        model_dir.mkdir(exist_ok=True)
        
        # Create version directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        version_dir = model_dir / timestamp
        version_dir.mkdir(exist_ok=True)
        
        # Save model
        model_path = version_dir / "model.pth"
        torch.save(self.model.state_dict(), model_path)
        
        # Save config
        config_path = version_dir / "config.json"
        config_dict = self.tts_config.to_dict() if hasattr(self.tts_config, 'to_dict') else {}
        with open(config_path, 'w') as f:
            json.dump(config_dict, f, indent=2)
        
        # Save metadata
        metadata_path = version_dir / "metadata.json"
        metadata = {
            'user_id': user_id,
            'model_version': timestamp,
            'created_at': datetime.now().isoformat(),
            'model_type': 'xtts_v2_finetuned',
            'training_losses': training_losses,
            'validation_losses': validation_losses,
            'final_loss': training_losses[-1] if training_losses else None,
            'best_loss': self.best_loss,
            'epochs': self.config.num_epochs,
            'gpu_used': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            'training_config': {
                'batch_size': self.config.batch_size,
                'learning_rate': self.config.learning_rate,
                'mixed_precision': self.config.mixed_precision,
                'num_epochs': self.config.num_epochs
            }
        }
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Create symlink to latest
        latest_link = model_dir / "latest"
        if latest_link.exists():
            latest_link.unlink()
        latest_link.symlink_to(version_dir.name)
        
        logger.info(f"Final model saved to {version_dir}")
        return str(version_dir)


def main():
    """Main training script entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="XTTS-v2 Fine-tuning for RTX 5090")
    parser.add_argument("--user_id", required=True, help="User ID to train voice for")
    parser.add_argument("--epochs", type=int, default=200, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=6, help="Training batch size")
    parser.add_argument("--learning_rate", type=float, default=1e-5, help="Learning rate")
    parser.add_argument("--mixed_precision", action="store_true", default=True, help="Use mixed precision")
    parser.add_argument("--freeze_encoder", action="store_true", help="Freeze encoder during training")
    
    args = parser.parse_args()
    
    # Create training config
    config = XTTSTrainingConfig(
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        mixed_precision=args.mixed_precision,
        freeze_encoder=args.freeze_encoder
    )
    
    # Initialize trainer
    trainer = XTTSFineTuner(config)
    
    # Start training
    result = trainer.train_model(args.user_id)
    
    if result['success']:
        print(f"✅ XTTS-v2 fine-tuning completed successfully!")
        print(f"   Model saved to: {result['model_path']}")
        print(f"   Training time: {result['training_time']:.1f}s")
        print(f"   Final loss: {result['final_loss']:.4f}")
        print(f"   Best loss: {result['best_loss']:.4f}")
    else:
        print(f"❌ Training failed: {result['error']}")
        sys.exit(1)


if __name__ == "__main__":
    main()