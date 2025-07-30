"""
Voice Data Preprocessing Pipeline
Optimized for RTX 5090 and XTTS-v2 training requirements
"""

import os
import sys
import json
import logging
import librosa
import soundfile as sf
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import subprocess
import torch
import torchaudio
from scipy import signal
from sklearn.preprocessing import StandardScaler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class VoiceDataPreprocessor:
    """Comprehensive voice data preprocessing for XTTS-v2 training."""
    
    def __init__(self, target_sr: int = 22050):
        self.target_sr = target_sr
        self.min_duration = 2.0  # Minimum 2 seconds
        self.max_duration = 12.0  # Maximum 12 seconds
        self.target_loudness = -23.0  # LUFS
        self.noise_threshold = 0.01
        
    def analyze_voice_directory(self, voice_dir: Path) -> Dict[str, any]:
        """Analyze all voice files in directory and provide preprocessing recommendations."""
        
        if not voice_dir.exists():
            return {
                'success': False,
                'error': f'Directory not found: {voice_dir}'
            }
        
        # Find all audio files
        audio_extensions = ['.wav', '.webm', '.mp3', '.flac', '.m4a', '.ogg']
        audio_files = []
        
        for ext in audio_extensions:
            audio_files.extend(voice_dir.glob(f"*{ext}"))
        
        if not audio_files:
            return {
                'success': False,
                'error': f'No audio files found in {voice_dir}'
            }
        
        logger.info(f"Analyzing {len(audio_files)} audio files...")
        
        analysis_results = {
            'total_files': len(audio_files),
            'valid_files': 0,
            'files_needing_conversion': 0,
            'files_too_short': 0,
            'files_too_long': 0,
            'files_too_quiet': 0,
            'files_too_loud': 0,
            'total_duration': 0.0,
            'average_duration': 0.0,
            'sample_rates': {},
            'file_details': [],
            'recommendations': []
        }
        
        # Analyze each file
        for audio_file in audio_files:
            try:
                file_analysis = self._analyze_single_file(audio_file)
                analysis_results['file_details'].append(file_analysis)
                
                # Update statistics
                if file_analysis['valid']:
                    analysis_results['valid_files'] += 1
                
                analysis_results['total_duration'] += file_analysis['duration']
                
                # Track sample rates
                sr = file_analysis['sample_rate']
                analysis_results['sample_rates'][sr] = analysis_results['sample_rates'].get(sr, 0) + 1
                
                # Count issues
                if file_analysis['needs_conversion']:
                    analysis_results['files_needing_conversion'] += 1
                if file_analysis['too_short']:
                    analysis_results['files_too_short'] += 1
                if file_analysis['too_long']:
                    analysis_results['files_too_long'] += 1
                if file_analysis['too_quiet']:
                    analysis_results['files_too_quiet'] += 1
                if file_analysis['too_loud']:
                    analysis_results['files_too_loud'] += 1
                    
            except Exception as e:
                logger.error(f"Failed to analyze {audio_file}: {e}")
                analysis_results['file_details'].append({
                    'filename': audio_file.name,
                    'error': str(e),
                    'valid': False
                })
        
        # Calculate averages
        if analysis_results['total_files'] > 0:
            analysis_results['average_duration'] = analysis_results['total_duration'] / analysis_results['total_files']
        
        # Generate recommendations
        analysis_results['recommendations'] = self._generate_preprocessing_recommendations(analysis_results)
        
        analysis_results['success'] = True
        return analysis_results
    
    def _analyze_single_file(self, audio_path: Path) -> Dict[str, any]:
        """Analyze a single audio file."""
        try:
            # Load audio
            if audio_path.suffix.lower() == '.webm':
                audio, sr = self._load_webm_file(audio_path)
            else:
                audio, sr = librosa.load(str(audio_path), sr=None)
            
            duration = len(audio) / sr
            
            # Basic validations
            too_short = duration < self.min_duration
            too_long = duration > self.max_duration
            needs_conversion = audio_path.suffix.lower() in ['.webm', '.mp3', '.m4a', '.ogg']
            
            # Audio quality analysis
            rms = np.sqrt(np.mean(audio**2))
            db_level = 20 * np.log10(rms + 1e-8)
            too_quiet = rms < self.noise_threshold
            too_loud = db_level > -6.0  # Avoid clipping
            
            # Frequency analysis
            stft = librosa.stft(audio)
            magnitude = np.abs(stft)
            freq_energy = np.mean(magnitude, axis=1)
            
            # Voice activity detection
            frame_length = 2048
            hop_length = 512
            silence_threshold = 0.01
            
            frames = librosa.util.frame(audio, frame_length=frame_length, hop_length=hop_length)
            frame_energy = np.sum(frames**2, axis=0)
            voice_frames = frame_energy > silence_threshold
            voice_ratio = np.sum(voice_frames) / len(voice_frames)
            
            # Signal-to-noise ratio estimation
            noise_frames = frame_energy[frame_energy < np.percentile(frame_energy, 20)]
            signal_frames = frame_energy[frame_energy > np.percentile(frame_energy, 80)]
            
            if len(noise_frames) > 0 and len(signal_frames) > 0:
                snr_db = 10 * np.log10(np.mean(signal_frames) / np.mean(noise_frames))
            else:
                snr_db = 0.0
            
            return {
                'filename': audio_path.name,
                'duration': duration,
                'sample_rate': sr,
                'rms_level': float(rms),
                'db_level': float(db_level),
                'voice_ratio': float(voice_ratio),
                'snr_db': float(snr_db),
                'too_short': too_short,
                'too_long': too_long,
                'too_quiet': too_quiet,
                'too_loud': too_loud,
                'needs_conversion': needs_conversion,
                'valid': not (too_short or too_quiet) and voice_ratio > 0.3,
                'file_size_mb': audio_path.stat().st_size / 1e6
            }
            
        except Exception as e:
            return {
                'filename': audio_path.name,
                'error': str(e),
                'valid': False,
                'needs_conversion': False,
                'too_short': False,
                'too_long': False,
                'too_quiet': False,
                'too_loud': False
            }
    
    def _load_webm_file(self, webm_path: Path) -> Tuple[np.ndarray, int]:
        """Load WebM file using ffmpeg."""
        try:
            # Use librosa with ffmpeg backend
            audio, sr = librosa.load(str(webm_path), sr=self.target_sr)
            return audio, sr
        except Exception as e:
            logger.error(f"Failed to load WebM file {webm_path}: {e}")
            raise
    
    def _generate_preprocessing_recommendations(self, analysis: Dict) -> List[str]:
        """Generate preprocessing recommendations based on analysis."""
        recommendations = []
        
        # Conversion recommendations
        if analysis['files_needing_conversion'] > 0:
            recommendations.append(
                f"Convert {analysis['files_needing_conversion']} files to WAV format for better compatibility"
            )
        
        # Duration recommendations
        if analysis['files_too_short'] > 0:
            recommendations.append(
                f"Remove or concatenate {analysis['files_too_short']} files that are too short (< 2s)"
            )
        
        if analysis['files_too_long'] > 0:
            recommendations.append(
                f"Split {analysis['files_too_long']} files that are too long (> 12s) into segments"
            )
        
        # Audio level recommendations
        if analysis['files_too_quiet'] > 0:
            recommendations.append(
                f"Amplify {analysis['files_too_quiet']} files that are too quiet"
            )
        
        if analysis['files_too_loud'] > 0:
            recommendations.append(
                f"Normalize {analysis['files_too_loud']} files that are too loud"
            )
        
        # Sample rate recommendations
        sample_rates = analysis['sample_rates']
        if len(sample_rates) > 1:
            most_common_sr = max(sample_rates, key=sample_rates.get)
            if most_common_sr != 22050:
                recommendations.append(
                    f"Resample all files to 22050 Hz (current: {list(sample_rates.keys())})"
                )
        
        # Training data quality
        if analysis['total_duration'] < 30:
            recommendations.append(
                "⚠️ Very limited training data. Consider recording more samples for better results"
            )
        elif analysis['total_duration'] < 60:
            recommendations.append(
                "⚠️ Limited training data. Additional samples recommended for optimal results"
            )
        
        if analysis['valid_files'] < 3:
            recommendations.append(
                "⚠️ Insufficient valid files for training. Need at least 3-5 good quality samples"
            )
        
        return recommendations
    
    def preprocess_voice_directory(
        self, 
        voice_dir: Path, 
        output_dir: Optional[Path] = None,
        apply_filters: bool = True
    ) -> Dict[str, any]:
        """Preprocess all voice files in directory for training."""
        
        if output_dir is None:
            output_dir = voice_dir / "processed"
        
        output_dir.mkdir(exist_ok=True)
        
        logger.info(f"Preprocessing voice files from {voice_dir} to {output_dir}")
        
        # First, analyze the directory
        analysis = self.analyze_voice_directory(voice_dir)
        if not analysis['success']:
            return analysis
        
        # Process each valid file
        processed_files = []
        skipped_files = []
        
        for file_detail in analysis['file_details']:
            if 'error' in file_detail:
                skipped_files.append({
                    'filename': file_detail['filename'],
                    'reason': file_detail['error']
                })
                continue
            
            try:
                input_path = voice_dir / file_detail['filename']
                processed_file = self._preprocess_single_file(
                    input_path, 
                    output_dir, 
                    file_detail,
                    apply_filters
                )
                
                if processed_file:
                    processed_files.append(processed_file)
                else:
                    skipped_files.append({
                        'filename': file_detail['filename'],
                        'reason': 'Failed preprocessing'
                    })
                    
            except Exception as e:
                logger.error(f"Failed to preprocess {file_detail['filename']}: {e}")
                skipped_files.append({
                    'filename': file_detail['filename'],
                    'reason': str(e)
                })
        
        # Create training metadata
        metadata = {
            'created_at': datetime.now().isoformat(),
            'source_directory': str(voice_dir),
            'output_directory': str(output_dir),
            'total_input_files': analysis['total_files'],
            'processed_files': len(processed_files),
            'skipped_files': len(skipped_files),
            'preprocessing_settings': {
                'target_sample_rate': self.target_sr,
                'target_loudness': self.target_loudness,
                'min_duration': self.min_duration,
                'max_duration': self.max_duration,
                'filters_applied': apply_filters
            },
            'files': processed_files,
            'skipped': skipped_files
        }
        
        # Save metadata
        metadata_path = output_dir / "preprocessing_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Preprocessing complete: {len(processed_files)} files processed, {len(skipped_files)} skipped")
        
        return {
            'success': True,
            'processed_files': len(processed_files),
            'skipped_files': len(skipped_files),
            'output_directory': str(output_dir),
            'metadata_path': str(metadata_path),
            'files': processed_files,
            'total_duration': sum(f['duration'] for f in processed_files)
        }
    
    def _preprocess_single_file(
        self, 
        input_path: Path, 
        output_dir: Path, 
        file_analysis: Dict,
        apply_filters: bool
    ) -> Optional[Dict]:
        """Preprocess a single audio file."""
        
        try:
            # Skip files that are too problematic
            if file_analysis['too_short'] or (file_analysis['too_quiet'] and file_analysis['voice_ratio'] < 0.2):
                logger.info(f"Skipping {input_path.name}: quality too low")
                return None
            
            # Load audio
            if input_path.suffix.lower() == '.webm':
                audio, sr = self._load_webm_file(input_path)
            else:
                audio, sr = librosa.load(str(input_path), sr=self.target_sr)
            
            # Apply preprocessing steps
            processed_audio = self._apply_audio_processing(audio, apply_filters)
            
            # Handle duration issues
            if file_analysis['too_long']:
                # Split into segments
                segments = self._split_audio_into_segments(processed_audio)
                
                saved_files = []
                for i, segment in enumerate(segments):
                    output_filename = f"{input_path.stem}_segment_{i+1}.wav"
                    output_path = output_dir / output_filename
                    
                    sf.write(output_path, segment, self.target_sr)
                    
                    saved_files.append({
                        'filename': output_filename,
                        'duration': len(segment) / self.target_sr,
                        'sample_rate': self.target_sr,
                        'source_file': input_path.name,
                        'segment_index': i
                    })
                
                return saved_files[0] if saved_files else None  # Return first segment info
            
            else:
                # Save single processed file
                output_filename = f"{input_path.stem}_processed.wav"
                output_path = output_dir / output_filename
                
                sf.write(output_path, processed_audio, self.target_sr)
                
                return {
                    'filename': output_filename,
                    'duration': len(processed_audio) / self.target_sr,
                    'sample_rate': self.target_sr,
                    'source_file': input_path.name,
                    'processing_applied': apply_filters
                }
        
        except Exception as e:
            logger.error(f"Failed to preprocess {input_path}: {e}")
            return None
    
    def _apply_audio_processing(self, audio: np.ndarray, apply_filters: bool) -> np.ndarray:
        """Apply audio processing steps."""
        
        # Remove silence from start and end
        audio_trimmed, _ = librosa.effects.trim(audio, top_db=20)
        
        if not apply_filters:
            return librosa.util.normalize(audio_trimmed)
        
        # Apply noise reduction (simple spectral gating)
        audio_denoised = self._apply_noise_reduction(audio_trimmed)
        
        # Apply normalization
        audio_normalized = librosa.util.normalize(audio_denoised)
        
        # Apply gentle EQ to enhance voice frequencies
        audio_eq = self._apply_voice_eq(audio_normalized)
        
        # Final normalization
        audio_final = librosa.util.normalize(audio_eq)
        
        return audio_final
    
    def _apply_noise_reduction(self, audio: np.ndarray) -> np.ndarray:
        """Apply simple noise reduction using spectral gating."""
        try:
            # Compute STFT
            stft = librosa.stft(audio, n_fft=2048, hop_length=512)
            magnitude, phase = np.abs(stft), np.angle(stft)
            
            # Estimate noise floor from quietest frames
            frame_energy = np.mean(magnitude, axis=0)
            noise_threshold = np.percentile(frame_energy, 20)
            
            # Apply spectral gating
            noise_gate = magnitude > (noise_threshold * 2)
            magnitude_clean = magnitude * noise_gate
            
            # Reconstruct audio
            stft_clean = magnitude_clean * np.exp(1j * phase)
            audio_clean = librosa.istft(stft_clean, hop_length=512)
            
            return audio_clean
        
        except Exception as e:
            logger.warning(f"Noise reduction failed, using original audio: {e}")
            return audio
    
    def _apply_voice_eq(self, audio: np.ndarray) -> np.ndarray:
        """Apply gentle EQ to enhance voice frequencies."""
        try:
            # Design filters for voice enhancement
            # Slight boost around 1-3 kHz (vocal clarity)
            # Gentle high-pass to remove low-frequency noise
            
            nyquist = self.target_sr // 2
            
            # High-pass filter at 80 Hz
            sos_hp = signal.butter(4, 80 / nyquist, btype='high', output='sos')
            audio_hp = signal.sosfilt(sos_hp, audio)
            
            # Gentle boost around 2 kHz
            center_freq = 2000
            Q = 2.0
            gain_db = 2.0
            
            # Create peaking EQ
            w0 = 2 * np.pi * center_freq / self.target_sr
            alpha = np.sin(w0) / (2 * Q)
            A = 10**(gain_db / 40)
            
            b0 = 1 + alpha * A
            b1 = -2 * np.cos(w0)
            b2 = 1 - alpha * A
            a0 = 1 + alpha / A
            a1 = -2 * np.cos(w0)
            a2 = 1 - alpha / A
            
            # Normalize
            b = np.array([b0, b1, b2]) / a0
            a = np.array([1, a1, a2]) / a0
            
            audio_eq = signal.lfilter(b, a, audio_hp)
            
            return audio_eq
        
        except Exception as e:
            logger.warning(f"EQ processing failed, using original audio: {e}")
            return audio
    
    def _split_audio_into_segments(self, audio: np.ndarray) -> List[np.ndarray]:
        """Split long audio into suitable segments."""
        segment_length = int(self.max_duration * self.target_sr)
        overlap = int(1.0 * self.target_sr)  # 1 second overlap
        
        segments = []
        start = 0
        
        while start < len(audio):
            end = min(start + segment_length, len(audio))
            segment = audio[start:end]
            
            # Only keep segments that are long enough
            if len(segment) >= self.min_duration * self.target_sr:
                segments.append(segment)
            
            start += segment_length - overlap
        
        return segments


def main():
    """CLI interface for voice data preprocessing."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Voice Data Preprocessing Pipeline")
    parser.add_argument("--action", required=True, choices=['analyze', 'preprocess'],
                       help="Action to perform")
    parser.add_argument("--voice_dir", required=True, help="Directory containing voice files")
    parser.add_argument("--output_dir", help="Output directory for processed files")
    parser.add_argument("--no_filters", action="store_true", help="Skip audio filtering")
    parser.add_argument("--target_sr", type=int, default=22050, help="Target sample rate")
    
    args = parser.parse_args()
    
    voice_dir = Path(args.voice_dir)
    if not voice_dir.exists():
        print(f"❌ Voice directory not found: {voice_dir}")
        sys.exit(1)
    
    preprocessor = VoiceDataPreprocessor(target_sr=args.target_sr)
    
    if args.action == 'analyze':
        print(f"🔍 Analyzing voice files in {voice_dir}...")
        result = preprocessor.analyze_voice_directory(voice_dir)
        
        if result['success']:
            print(f"\n📊 Analysis Results:")
            print(f"   Total files: {result['total_files']}")
            print(f"   Valid files: {result['valid_files']}")
            print(f"   Total duration: {result['total_duration']:.1f}s")
            print(f"   Average duration: {result['average_duration']:.1f}s")
            
            if result['recommendations']:
                print(f"\n💡 Recommendations:")
                for rec in result['recommendations']:
                    print(f"   • {rec}")
            
            print(f"\n📁 File Details:")
            for file_detail in result['file_details']:
                status = "✅" if file_detail.get('valid', False) else "❌"
                duration = file_detail.get('duration', 0)
                print(f"   {status} {file_detail['filename']} ({duration:.1f}s)")
        else:
            print(f"❌ Analysis failed: {result['error']}")
    
    elif args.action == 'preprocess':
        output_dir = Path(args.output_dir) if args.output_dir else voice_dir / "processed"
        apply_filters = not args.no_filters
        
        print(f"🔧 Preprocessing voice files...")
        print(f"   Input: {voice_dir}")
        print(f"   Output: {output_dir}")
        print(f"   Filters: {'enabled' if apply_filters else 'disabled'}")
        
        result = preprocessor.preprocess_voice_directory(
            voice_dir, 
            output_dir, 
            apply_filters
        )
        
        if result['success']:
            print(f"\n✅ Preprocessing completed:")
            print(f"   Processed: {result['processed_files']} files")
            print(f"   Skipped: {result['skipped_files']} files")
            print(f"   Total duration: {result['total_duration']:.1f}s")
            print(f"   Output directory: {result['output_directory']}")
            print(f"   Metadata: {result['metadata_path']}")
        else:
            print(f"❌ Preprocessing failed: {result.get('error', 'Unknown error')}")


if __name__ == "__main__":
    main()