#!/bin/bash
# Hybrid Voice Training Installation Script
# Quick installer for the complete hybrid training pipeline

set -e

echo "🚀 Installing Hybrid Voice Training Pipeline..."
echo "=============================================="
echo ""

# Check if running as correct user
if [[ "$USER" != "luke" ]]; then
    echo "❌ Please run this script as user 'luke'"
    exit 1
fi

# Check if in correct directory
EXPECTED_DIR="/home/luke/personal-ai-clone"
if [[ "$PWD" != "$EXPECTED_DIR" ]]; then
    echo "❌ Please run this script from $EXPECTED_DIR"
    echo "Current directory: $PWD"
    exit 1
fi

echo "📋 Pre-installation checks..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "✅ Python $PYTHON_VERSION detected"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

echo "✅ Docker detected"

# Check if ML directory exists
if [[ ! -d "ml" ]]; then
    echo "❌ ML directory not found. Are you in the correct project directory?"
    exit 1
fi

echo "✅ Project structure validated"

# Install required Python packages
echo ""
echo "📦 Installing Python dependencies..."

# Core packages for the hybrid training system
PACKAGES=(
    "cryptography"
    "requests" 
    "flask"
    "schedule"
    "fastapi"
    "uvicorn"
    "sqlalchemy"
)

for package in "${PACKAGES[@]}"; do
    echo "Installing $package..."
    pip3 install --user "$package" || {
        echo "❌ Failed to install $package"
        exit 1
    }
done

echo "✅ Python dependencies installed"

# Create required directories
echo ""
echo "📁 Creating directory structure..."

sudo mkdir -p /models/voices
sudo chown luke:luke /models/voices
sudo mkdir -p /tmp/voice_training
sudo chown luke:luke /tmp/voice_training

echo "✅ Directories created"

# Make scripts executable
echo ""
echo "🔧 Setting up permissions..."

chmod +x ml/*.py
chmod +x ml/setup_hybrid_training.py

echo "✅ Permissions configured"

# Run the main setup script
echo ""
echo "⚙️ Running detailed setup and validation..."
echo ""

python3 ml/setup_hybrid_training.py

# Check if setup was successful
if [[ $? -eq 0 ]]; then
    echo ""
    echo "🎉 Installation completed successfully!"
    echo ""
    echo "🚀 Quick Start:"
    echo "  1. Record voice samples through your web interface"
    echo "  2. Run: ./ml/quick_start_training.sh"
    echo "  3. Follow the Google Colab instructions"
    echo ""
    echo "📖 Full documentation: ./ml/README_HYBRID_TRAINING.md"
    echo ""
else
    echo ""
    echo "❌ Installation failed. Please check the output above."
    exit 1
fi