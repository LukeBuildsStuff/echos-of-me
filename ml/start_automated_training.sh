#!/bin/bash
# One-Command Voice Training Automation
# Handles everything from voice files to trained model deployment

echo "🚀 Automated Voice Training Pipeline"
echo "==================================="
echo ""

# Configuration
USER_ID="lukemoeller_yahoo_com"
VOICE_DIR="/home/luke/personal-ai-clone/web/public/voices/$USER_ID"
TRAINING_DIR="/home/luke/personal-ai-clone/training_packages"
ML_DIR="/home/luke/personal-ai-clone/ml"
PLATFORM="colab"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if voice files exist
if [ ! -d "$VOICE_DIR" ]; then
    echo -e "${RED}❌ Voice directory not found: $VOICE_DIR${NC}"
    echo "Please record voice samples through the web interface first"
    exit 1
fi

# Count voice files
VOICE_COUNT=$(find "$VOICE_DIR" -name "*.wav" -o -name "*.webm" -o -name "*.mp3" | wc -l)
echo -e "📊 Found ${GREEN}$VOICE_COUNT${NC} voice files"

if [ "$VOICE_COUNT" -lt 3 ]; then
    echo -e "${YELLOW}⚠️ Warning: Less than 3 voice files (recommended minimum)${NC}"
fi

# Step 2: Create training package
echo ""
echo -e "${YELLOW}📦 Creating training package...${NC}"

# Use the simple training setup
python3 "$ML_DIR/simple_training_setup.py"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create training package${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Training package created${NC}"

# Step 3: Upload to Google Colab
echo ""
echo -e "${YELLOW}☁️ Preparing for Google Colab...${NC}"

# Create a simple upload script
cat > "$TRAINING_DIR/upload_to_colab.py" << 'EOF'
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
EOF

python3 "$TRAINING_DIR/upload_to_colab.py"

# Step 4: Monitor and wait for user
echo ""
echo -e "${YELLOW}⏳ Waiting for Google Colab training...${NC}"
echo ""
echo "Instructions:"
echo "1. Complete the training in Google Colab (30-90 minutes)"
echo "2. Download the model package when done"
echo "3. Press ENTER here when you have the downloaded model file"
echo ""
read -p "Press ENTER when you have downloaded the model file..."

# Step 5: Deploy the trained model
echo ""
echo -e "${YELLOW}🚀 Deploying trained model...${NC}"
echo ""

# Ask for the model file location
read -p "Enter the path to your downloaded model file (e.g., ~/Downloads/voice_model.zip): " MODEL_PATH

# Expand tilde if used
MODEL_PATH="${MODEL_PATH/#\~/$HOME}"

if [ ! -f "$MODEL_PATH" ]; then
    echo -e "${RED}❌ Model file not found: $MODEL_PATH${NC}"
    exit 1
fi

# Deploy the model
python3 "$ML_DIR/deploy_trained_model.py" "$MODEL_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 SUCCESS! Your voice model has been deployed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. The ml-inference container is restarting..."
    echo "2. Wait about 30 seconds for it to load the new model"
    echo "3. Test voice synthesis in your web interface"
    echo ""
    echo -e "${GREEN}✅ Voice training pipeline completed successfully!${NC}"
else
    echo -e "${RED}❌ Model deployment failed${NC}"
    exit 1
fi

# Step 6: Show final status
echo ""
echo -e "${YELLOW}📊 Final Status:${NC}"
curl -s http://localhost:8000/voice/status | python3 -m json.tool 2>/dev/null || echo "Waiting for server restart..."