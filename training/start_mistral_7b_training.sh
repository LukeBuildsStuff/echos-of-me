#!/bin/bash
"""
Mistral 7B Training Startup Script
Author: Claude Code (Training Orchestrator)

This script orchestrates the complete Mistral 7B training process:
1. Environment validation
2. Training execution
3. Model validation and deployment
"""

set -e  # Exit on any error

# Configuration
LOG_DIR="/training/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/mistral_training_$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running in Docker container
check_environment() {
    log "Checking training environment..."
    
    if [ -f /.dockerenv ]; then
        log_success "Running in Docker container"
        DOCKER_MODE=true
    else
        log_warning "Running on host system"
        DOCKER_MODE=false
    fi
    
    # Check if we're in the training directory
    if [ ! -f "mistral_7b_lora_trainer.py" ]; then
        log_error "Training scripts not found. Please run from /training directory"
        exit 1
    fi
    
    log_success "Environment check passed"
}

# Run validation
run_validation() {
    log "Running Mistral 7B pipeline validation..."
    
    if python validate_mistral_7b_pipeline.py; then
        log_success "Pipeline validation passed - ready for training"
        return 0
    else
        validation_status=$?
        if [ $validation_status -eq 1 ]; then
            log_warning "Pipeline validation completed with warnings - proceeding with caution"
            return 0
        else
            log_error "Pipeline validation failed - aborting training"
            exit 1
        fi
    fi
}

# Start training
start_training() {
    log "Starting Mistral 7B training with conservative RTX 5090 settings..."
    
    # Record start time
    START_TIME=$(date +%s)
    
    # Run training script
    if python mistral_7b_lora_trainer.py 2>&1 | tee -a "$LOG_FILE"; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        DURATION_MIN=$((DURATION / 60))
        
        log_success "Training completed successfully in ${DURATION_MIN} minutes"
        return 0
    else
        log_error "Training failed - check logs for details"
        return 1
    fi
}

# Validate trained model
validate_model() {
    log "Validating trained Mistral 7B model..."
    
    MODEL_PATH="/training/mistral_final_model"
    
    if [ ! -d "$MODEL_PATH" ]; then
        log_error "Trained model not found at $MODEL_PATH"
        return 1
    fi
    
    if python deploy_mistral_7b.py validate --model-path "$MODEL_PATH"; then
        log_success "Model validation passed"
        return 0
    else
        log_error "Model validation failed"
        return 1
    fi
}

# Deploy model
deploy_model() {
    log "Deploying Mistral 7B model..."
    
    MODEL_PATH="/training/mistral_final_model"
    DEPLOYMENT_NAME="mistral_7b_${TIMESTAMP}"
    USER_ID="2"  # Luke's user ID
    
    if python deploy_mistral_7b.py deploy \
        --model-path "$MODEL_PATH" \
        --deployment-name "$DEPLOYMENT_NAME" \
        --user-id "$USER_ID" 2>&1 | tee -a "$LOG_FILE"; then
        
        log_success "Model deployed successfully as: $DEPLOYMENT_NAME"
        return 0
    else
        log_error "Model deployment failed"
        return 1
    fi
}

# Test deployed model
test_deployment() {
    log "Testing deployed Mistral 7B model..."
    
    DEPLOYMENT_NAME="mistral_7b_${TIMESTAMP}"
    
    if python deploy_mistral_7b.py test --deployment-name "$DEPLOYMENT_NAME"; then
        log_success "Deployment test passed"
        return 0
    else
        log_warning "Deployment test had issues - manual verification recommended"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    
    # Clear GPU memory
    if command -v nvidia-smi &> /dev/null; then
        python -c "import torch; torch.cuda.empty_cache()" 2>/dev/null || true
    fi
    
    # Archive logs
    if [ -f "$LOG_FILE" ]; then
        cp "$LOG_FILE" "/training/logs/latest_mistral_training.log"
        log_success "Training log archived"
    fi
}

# Display system info
show_system_info() {
    log "System Information:"
    echo "==================" | tee -a "$LOG_FILE"
    
    # GPU info
    if command -v nvidia-smi &> /dev/null; then
        echo "GPU Information:" | tee -a "$LOG_FILE"
        nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits | tee -a "$LOG_FILE"
        echo "" | tee -a "$LOG_FILE"
    fi
    
    # Python info
    echo "Python: $(python --version)" | tee -a "$LOG_FILE"
    echo "PyTorch: $(python -c 'import torch; print(torch.__version__)')" | tee -a "$LOG_FILE"
    
    # Check transformers version
    TRANSFORMERS_VERSION=$(python -c "import transformers; print(transformers.__version__)" 2>/dev/null || echo "Not installed")
    echo "Transformers: $TRANSFORMERS_VERSION" | tee -a "$LOG_FILE"
    
    echo "==================" | tee -a "$LOG_FILE"
}

# Main execution flow
main() {
    log "🚀 Starting Mistral 7B Training Pipeline for RTX 5090"
    log "Timestamp: $TIMESTAMP"
    log "Log file: $LOG_FILE"
    echo ""
    
    # Set up error handling
    trap cleanup EXIT
    
    # Show system information
    show_system_info
    echo ""
    
    # Step 1: Environment check
    check_environment
    echo ""
    
    # Step 2: Pipeline validation
    if ! run_validation; then
        exit 1
    fi
    echo ""
    
    # Step 3: Start training
    log "🔥 Beginning Mistral 7B training..."
    if ! start_training; then
        log_error "Training pipeline failed"
        exit 1
    fi
    echo ""
    
    # Step 4: Validate trained model
    if ! validate_model; then
        log_error "Model validation failed - training may have issues"
        exit 1
    fi
    echo ""
    
    # Step 5: Deploy model
    if ! deploy_model; then
        log_error "Model deployment failed"
        exit 1
    fi
    echo ""
    
    # Step 6: Test deployment
    test_deployment
    echo ""
    
    # Success summary
    log_success "🎉 Mistral 7B Training Pipeline Completed Successfully!"
    log "Summary:"
    log "  • Training: Completed"
    log "  • Validation: Passed"
    log "  • Deployment: Success"
    log "  • Log file: $LOG_FILE"
    log ""
    log "The Mistral 7B model is now ready for use in the chat interface."
    log "You can test it by accessing the AI Echo chat feature."
    
    return 0
}

# Help function
show_help() {
    echo "Mistral 7B Training Script for RTX 5090"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --validate-only    Run only the validation phase"
    echo "  --train-only      Run only the training phase"
    echo "  --deploy-only     Run only the deployment phase"
    echo "  --help           Show this help message"
    echo ""
    echo "Default: Run complete pipeline (validate + train + deploy)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full pipeline"
    echo "  $0 --validate-only    # Just validate readiness"
    echo "  $0 --train-only      # Just train model"
    echo ""
}

# Parse command line arguments
case "${1:-}" in
    --validate-only)
        log "Running validation-only mode"
        check_environment
        show_system_info
        run_validation
        ;;
    --train-only)
        log "Running training-only mode"
        check_environment
        start_training
        validate_model
        ;;
    --deploy-only)
        log "Running deployment-only mode"
        check_environment
        deploy_model
        test_deployment
        ;;
    --help)
        show_help
        exit 0
        ;;
    "")
        # Default: run full pipeline
        main
        ;;
    *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac