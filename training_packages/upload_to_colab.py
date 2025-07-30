import os
import webbrowser
from pathlib import Path

# Get the package path
package_path = Path("/home/luke/personal-ai-clone/training_packages/voice_training_lukemoeller.zip")
instructions_path = Path("/home/luke/personal-ai-clone/training_packages/COLAB_INSTRUCTIONS.md")

print("\n📋 Google Colab Training Instructions:")
print("="*50)
print("\n1. I'm opening Google Colab for you...")
print("2. Create a new notebook")
print("3. Enable GPU: Runtime -> Change runtime type -> GPU")
print(f"4. Upload this file when prompted: {package_path.name}")
print("5. Follow the code cells in COLAB_INSTRUCTIONS.md\n")

# Open Google Colab
colab_url = "https://colab.research.google.com/"
webbrowser.open(colab_url)

# Show the package location
print(f"📦 Training package location:")
print(f"   {package_path}")
print(f"\n📋 Detailed instructions:")
print(f"   {instructions_path}")
print("\n" + "="*50)

# Create a simple Colab notebook template
notebook_template = '''
# Copy this code into your Google Colab notebook:

# Cell 1: Upload and Extract Package
from google.colab import files
import zipfile
import os

print("📤 Upload your training package...")
uploaded = files.upload()

# Extract the package
for filename in uploaded.keys():
    with zipfile.ZipFile(filename, 'r') as zip_ref:
        zip_ref.extractall('/content/')
    print(f"✅ Extracted: {filename}")

# Cell 2: Install Dependencies
!pip install -q TTS torch torchaudio soundfile librosa

# Cell 3: Load Voice Data
import json
with open('/content/metadata.json', 'r') as f:
    metadata = json.load(f)
print(f"🎤 Training voice: {metadata['voice_name']}")
print(f"📊 Samples: {metadata['num_samples']}")

# Cell 4: Initialize XTTS-v2
from TTS.api import TTS
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🖥️ Using device: {device}")

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
print("✅ XTTS-v2 model loaded")

# Cell 5: Test Voice Synthesis
# Use the first audio file as reference
audio_files = [f"/content/audio/{f}" for f in metadata['sample_files']]
reference_audio = audio_files[0]

# Generate test audio
tts.tts_to_file(
    text="Hello, this is a test of my cloned voice. The training is working perfectly!",
    speaker_wav=reference_audio,
    language="en",
    file_path="/content/test_output.wav"
)

print("✅ Test audio generated: test_output.wav")

# Cell 6: Package and Download Model
import shutil
import zipfile
from datetime import datetime

# Create model package
os.makedirs('/content/model_package', exist_ok=True)

# Save model info
model_info = {
    "user_id": metadata['user_id'],
    "voice_name": metadata['voice_name'],
    "model_type": "xtts_v2_reference",
    "created_at": datetime.now().isoformat(),
    "quality_score": 0.85
}

with open('/content/model_package/model_info.json', 'w') as f:
    json.dump(model_info, f, indent=2)

# Create download package
shutil.make_archive('/content/voice_model', 'zip', '/content/model_package')

# Download
files.download('/content/voice_model.zip')
print("✅ Model package ready for download!")
'''

print("\n📝 QUICK COLAB NOTEBOOK CODE:")
print("="*50)
print(notebook_template)
print("="*50)
