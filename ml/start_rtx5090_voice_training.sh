#!/bin/bash

# RTX 5090 Voice Training Startup Script
# Leverages your proven NVIDIA container approach

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 RTX 5090 Voice Training System${NC}"
echo -e "${BLUE}===================================${NC}"

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if NVIDIA Docker runtime is available
if ! docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi > /dev/null 2>&1; then
    echo -e "${RED}❌ NVIDIA Docker runtime not available. Please install nvidia-container-toolkit.${NC}"
    exit 1
fi

# Check GPU
echo -e "${YELLOW}🔍 Checking GPU...${NC}"
if nvidia-smi | grep -q "RTX 5090"; then
    echo -e "${GREEN}✅ RTX 5090 detected${NC}"
else
    echo -e "${YELLOW}⚠️  RTX 5090 not detected. This script is optimized for RTX 5090.${NC}"
fi

# Function to show usage
show_usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 [COMMAND] [OPTIONS]"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo "  setup       - Build training container and setup environment"
    echo "  train       - Start voice training for a user"
    echo "  analyze     - Analyze voice data quality"
    echo "  preprocess  - Preprocess voice data"
    echo "  deploy      - Deploy trained model"
    echo "  status      - Check training status"
    echo "  cleanup     - Clean up old models"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  --user_id USER_ID     - User ID (required for most commands)"
    echo "  --epochs N            - Number of training epochs (default: 200)"
    echo "  --batch_size N        - Batch size (default: 6)"
    echo "  --learning_rate RATE  - Learning rate (default: 1e-5)"
    echo "  --no_deploy           - Skip auto deployment"
    echo "  --no_cleanup          - Skip cleanup"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0 setup"
    echo "  $0 analyze --user_id lukemoeller_yahoo_com"
    echo "  $0 train --user_id lukemoeller_yahoo_com --epochs 150"
    echo "  $0 deploy --user_id lukemoeller_yahoo_com"
}

# Parse command line arguments
COMMAND=""
USER_ID=""
EPOCHS=200
BATCH_SIZE=6
LEARNING_RATE=1e-5
NO_DEPLOY=false
NO_CLEANUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        setup|train|analyze|preprocess|deploy|status|cleanup)
            COMMAND="$1"
            shift
            ;;
        --user_id)
            USER_ID="$2"
            shift 2
            ;;
        --epochs)
            EPOCHS="$2"
            shift 2
            ;;
        --batch_size)
            BATCH_SIZE="$2"
            shift 2
            ;;
        --learning_rate)
            LEARNING_RATE="$2"
            shift 2
            ;;
        --no_deploy)
            NO_DEPLOY=true
            shift
            ;;
        --no_cleanup)
            NO_CLEANUP=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

if [[ -z "$COMMAND" ]]; then
    echo -e "${RED}❌ No command specified${NC}"
    show_usage
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Setup command
if [[ "$COMMAND" == "setup" ]]; then
    echo -e "${YELLOW}🏗️  Setting up RTX 5090 voice training environment...${NC}"
    
    # Install Python dependencies for the pipeline tools
    echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
    pip install docker python-dotenv GPUtil psutil requests
    
    # Setup training container
    echo -e "${YELLOW}🐳 Setting up RTX 5090 training container...${NC}"
    python3 voice_training_pipeline.py --action build
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Setup completed successfully!${NC}"
        echo -e "${GREEN}   Your RTX 5090 voice training environment is ready.${NC}"
    else
        echo -e "${RED}❌ Setup failed. Check the logs above.${NC}"
        exit 1
    fi
    
    exit 0
fi

# Commands that require USER_ID
if [[ "$COMMAND" != "status" ]] && [[ -z "$USER_ID" ]]; then
    echo -e "${RED}❌ --user_id is required for command: $COMMAND${NC}"
    exit 1
fi

# Analyze command
if [[ "$COMMAND" == "analyze" ]]; then
    echo -e "${YELLOW}🔍 Analyzing voice data for user: $USER_ID${NC}"
    
    VOICE_DIR="/home/luke/personal-ai-clone/web/public/voices/$USER_ID"
    
    if [[ ! -d "$VOICE_DIR" ]]; then
        echo -e "${RED}❌ Voice directory not found: $VOICE_DIR${NC}"
        exit 1
    fi
    
    python3 voice_data_preprocessor.py --action analyze --voice_dir "$VOICE_DIR"
    exit 0
fi

# Preprocess command
if [[ "$COMMAND" == "preprocess" ]]; then
    echo -e "${YELLOW}🔧 Preprocessing voice data for user: $USER_ID${NC}"
    
    VOICE_DIR="/home/luke/personal-ai-clone/web/public/voices/$USER_ID"
    
    if [[ ! -d "$VOICE_DIR" ]]; then
        echo -e "${RED}❌ Voice directory not found: $VOICE_DIR${NC}"
        exit 1
    fi
    
    python3 voice_data_preprocessor.py --action preprocess --voice_dir "$VOICE_DIR"
    exit 0
fi

# Train command
if [[ "$COMMAND" == "train" ]]; then
    echo -e "${YELLOW}🤖 Starting voice training for user: $USER_ID${NC}"
    echo -e "${YELLOW}   Epochs: $EPOCHS${NC}"
    echo -e "${YELLOW}   Batch size: $BATCH_SIZE${NC}"
    echo -e "${YELLOW}   Learning rate: $LEARNING_RATE${NC}"
    
    # Check if voice data exists
    VOICE_DIR="/home/luke/personal-ai-clone/web/public/voices/$USER_ID"
    if [[ ! -d "$VOICE_DIR" ]]; then
        echo -e "${RED}❌ Voice directory not found: $VOICE_DIR${NC}"
        echo -e "${YELLOW}💡 Please ensure voice recordings are available in: $VOICE_DIR${NC}"
        exit 1
    fi
    
    # Build command
    TRAIN_ARGS="--action train --user_id $USER_ID --epochs $EPOCHS --batch_size $BATCH_SIZE --learning_rate $LEARNING_RATE"
    
    # Check voice data first
    echo -e "${YELLOW}📊 Checking voice data quality...${NC}"
    python3 voice_training_pipeline.py --action check --user_id "$USER_ID"
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}❌ Voice data check failed. Please check your voice recordings.${NC}"
        exit 1
    fi
    
    # Start training
    echo -e "${GREEN}🚀 Starting training with RTX 5090 optimization...${NC}"
    python3 voice_training_pipeline.py $TRAIN_ARGS
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Training completed successfully!${NC}"
        
        # Auto deploy if not disabled
        if [[ "$NO_DEPLOY" == false ]]; then
            echo -e "${YELLOW}🚀 Auto-deploying trained model...${NC}"
            python3 model_deployment_system.py --action deploy --user_id "$USER_ID"
        fi
        
        # Auto cleanup if not disabled
        if [[ "$NO_CLEANUP" == false ]]; then
            echo -e "${YELLOW}🧹 Cleaning up old models...${NC}"
            python3 model_deployment_system.py --action cleanup --user_id "$USER_ID"
        fi
        
        echo -e "${GREEN}🎉 Voice training pipeline completed!${NC}"
    else
        echo -e "${RED}❌ Training failed. Check the logs above.${NC}"
        exit 1
    fi
    
    exit 0
fi

# Deploy command
if [[ "$COMMAND" == "deploy" ]]; then
    echo -e "${YELLOW}🚀 Deploying model for user: $USER_ID${NC}"
    
    python3 model_deployment_system.py --action deploy --user_id "$USER_ID"
    exit 0
fi

# Status command
if [[ "$COMMAND" == "status" ]]; then
    if [[ -n "$USER_ID" ]]; then
        echo -e "${YELLOW}📊 Checking status for user: $USER_ID${NC}"
        python3 model_deployment_system.py --action status --user_id "$USER_ID"
    else
        echo -e "${YELLOW}📊 Checking overall system status...${NC}"
        python3 model_deployment_system.py --action status
    fi
    exit 0
fi

# Cleanup command
if [[ "$COMMAND" == "cleanup" ]]; then
    echo -e "${YELLOW}🧹 Cleaning up models for user: $USER_ID${NC}"
    
    python3 model_deployment_system.py --action cleanup --user_id "$USER_ID"
    exit 0
fi

echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
show_usage
exit 1