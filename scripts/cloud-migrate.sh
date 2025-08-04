#!/bin/bash

# Echoes of Me - Cloud Migration Script
# Helps migrate from local development to cloud production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
CLOUD_PROVIDER=""
DEPLOYMENT_TARGET=""
BACKUP_DIR="./migration-backup-$(date +%Y%m%d-%H%M%S)"

show_help() {
    echo "Echoes of Me - Cloud Migration Helper"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  prepare     - Prepare for cloud migration"
    echo "  backup      - Backup local data"
    echo "  validate    - Validate cloud configuration"
    echo "  migrate     - Execute migration"
    echo "  rollback    - Rollback migration"
    echo ""
    echo "Options:"
    echo "  --provider  - Cloud provider (aws|gcp|azure|railway|vercel)"
    echo "  --target    - Deployment target (staging|production)"
    echo "  --dry-run   - Simulate migration without making changes"
    echo ""
    echo "Examples:"
    echo "  $0 prepare --provider aws --target staging"
    echo "  $0 migrate --provider railway --target production"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --provider)
                CLOUD_PROVIDER="$2"
                shift 2
                ;;
            --target)
                DEPLOYMENT_TARGET="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                COMMAND="$1"
                shift
                ;;
        esac
    done
}

# Validate prerequisites
validate_prerequisites() {
    print_status "Validating prerequisites..."
    
    local missing_tools=()
    
    # Check for required tools based on cloud provider
    case $CLOUD_PROVIDER in
        "aws")
            command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
            ;;
        "gcp")
            command -v gcloud >/dev/null 2>&1 || missing_tools+=("gcloud")
            ;;
        "azure")
            command -v az >/dev/null 2>&1 || missing_tools+=("azure-cli")
            ;;
        "railway")
            command -v railway >/dev/null 2>&1 || missing_tools+=("railway-cli")
            ;;
        "vercel")
            command -v vercel >/dev/null 2>&1 || missing_tools+=("vercel-cli")
            ;;
    esac
    
    # Check for Docker
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install missing tools before proceeding."
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

# Backup local data
backup_data() {
    print_status "Creating backup of local data..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker-compose -f docker-compose.dev.yml exec -T postgres pg_dump -U echosofme echosofme_dev > "$BACKUP_DIR/database.sql"; then
        print_success "Database backup created"
    else
        print_error "Database backup failed"
        return 1
    fi
    
    # Backup voice files
    if [ -d "public/voices" ]; then
        cp -r public/voices "$BACKUP_DIR/"
        print_success "Voice files backup created"
    fi
    
    # Backup environment configuration
    if [ -f ".env.local" ]; then
        cp .env.local "$BACKUP_DIR/env.local.backup"
        print_success "Environment configuration backup created"
    fi
    
    # Create migration manifest
    cat > "$BACKUP_DIR/migration-manifest.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "source": "local-development",
    "target": "$CLOUD_PROVIDER-$DEPLOYMENT_TARGET",
    "backup_location": "$BACKUP_DIR",
    "database_size": "$(du -sh $BACKUP_DIR/database.sql | cut -f1)",
    "voice_files_count": "$(find public/voices -type f | wc -l)",
    "voice_files_size": "$(du -sh public/voices | cut -f1)"
}
EOF
    
    print_success "Migration manifest created"
    echo "Backup location: $BACKUP_DIR"
}

# Generate cloud configuration
generate_cloud_config() {
    print_status "Generating cloud configuration for $CLOUD_PROVIDER..."
    
    local config_dir="./cloud-configs/$CLOUD_PROVIDER"
    mkdir -p "$config_dir"
    
    case $CLOUD_PROVIDER in
        "aws")
            generate_aws_config "$config_dir"
            ;;
        "gcp")
            generate_gcp_config "$config_dir"
            ;;
        "railway")
            generate_railway_config "$config_dir"
            ;;
        "vercel")
            generate_vercel_config "$config_dir"
            ;;
        *)
            print_error "Unsupported cloud provider: $CLOUD_PROVIDER"
            return 1
            ;;
    esac
    
    print_success "Cloud configuration generated in $config_dir"
}

# AWS Configuration
generate_aws_config() {
    local config_dir="$1"
    
    # AWS CloudFormation template
    cat > "$config_dir/cloudformation.yml" << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Echoes of Me - Family Legacy Preservation System'

Parameters:
  Environment:
    Type: String
    Default: staging
    AllowedValues: [staging, production]
  
  DatabaseInstanceClass:
    Type: String
    Default: db.t3.micro
    Description: RDS instance class
  
  RedisInstanceClass:
    Type: String
    Default: cache.t3.micro
    Description: ElastiCache instance class

Resources:
  # VPC Configuration
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${AWS::StackName}-vpc'

  # RDS PostgreSQL Database
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '${AWS::StackName}-postgres'
      DBInstanceClass: !Ref DatabaseInstanceClass
      Engine: postgres
      EngineVersion: '16.1'
      AllocatedStorage: 20
      StorageType: gp2
      DBName: echosofme
      MasterUsername: echosofme
      MasterUserPassword: !Ref DatabasePassword
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      MultiAZ: !If [IsProduction, true, false]
      BackupRetentionPeriod: !If [IsProduction, 7, 1]
      DeletionProtection: !If [IsProduction, true, false]

  # ElastiCache Redis
  RedisCluster:
    Type: AWS::ElastiCache::CacheCluster
    Properties:
      CacheNodeType: !Ref RedisInstanceClass
      Engine: redis
      NumCacheNodes: 1
      VpcSecurityGroupIds:
        - !Ref RedisSecurityGroup

  # S3 Bucket for voice files
  VoiceFilesBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '${AWS::StackName}-voices-${Environment}'
      VersioningConfiguration:
        Status: Enabled
      LifecycleConfiguration:
        Rules:
          - Status: Enabled
            Transitions:
              - StorageClass: STANDARD_IA
                TransitionInDays: 30
              - StorageClass: GLACIER
                TransitionInDays: 90

  # CloudFront Distribution
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - DomainName: !GetAtt VoiceFilesBucket.RegionalDomainName
            Id: S3Origin
            S3OriginConfig:
              OriginAccessIdentity: !Sub 'origin-access-identity/cloudfront/${OriginAccessIdentity}'
        Enabled: true
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods: [GET, HEAD]
          CachedMethods: [GET, HEAD]
          Compress: true

Conditions:
  IsProduction: !Equals [!Ref Environment, production]

Outputs:
  DatabaseEndpoint:
    Description: RDS PostgreSQL endpoint
    Value: !GetAtt Database.Endpoint.Address
    Export:
      Name: !Sub '${AWS::StackName}-database-endpoint'
  
  RedisEndpoint:
    Description: ElastiCache Redis endpoint
    Value: !GetAtt RedisCluster.RedisEndpoint.Address
    Export:
      Name: !Sub '${AWS::StackName}-redis-endpoint'
  
  S3BucketName:
    Description: S3 bucket for voice files
    Value: !Ref VoiceFilesBucket
    Export:
      Name: !Sub '${AWS::StackName}-s3-bucket'
EOF

    # AWS deployment script
    cat > "$config_dir/deploy.sh" << 'EOF'
#!/bin/bash
set -e

STACK_NAME="echosofme-${ENVIRONMENT:-staging}"
REGION="${AWS_REGION:-us-east-1}"

echo "Deploying to AWS CloudFormation..."
echo "Stack: $STACK_NAME"
echo "Region: $REGION"

aws cloudformation deploy \
    --template-file cloudformation.yml \
    --stack-name "$STACK_NAME" \
    --parameter-overrides Environment="${ENVIRONMENT:-staging}" \
    --capabilities CAPABILITY_IAM \
    --region "$REGION"

echo "Deployment completed!"
echo "Getting stack outputs..."

aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs'
EOF

    chmod +x "$config_dir/deploy.sh"
}

# Railway Configuration
generate_railway_config() {
    local config_dir="$1"
    
    # Railway project configuration
    cat > "$config_dir/railway.json" << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

    # Railway deployment script
    cat > "$config_dir/deploy.sh" << 'EOF'
#!/bin/bash
set -e

echo "Deploying to Railway..."

# Login to Railway (if not already)
if ! railway whoami &>/dev/null; then
    echo "Please login to Railway first:"
    echo "railway login"
    exit 1
fi

# Create or link project
if [ ! -f ".railway/project" ]; then
    echo "Creating new Railway project..."
    railway login
    railway init echosofme
else
    echo "Using existing Railway project..."
fi

# Add PostgreSQL database
railway add postgresql

# Add Redis
railway add redis

# Set environment variables
railway variables set NODE_ENV=production
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Deploy
railway up --detach

echo "Deployment completed!"
echo "Your app will be available at:"
railway domain
EOF

    chmod +x "$config_dir/deploy.sh"
}

# Validate cloud configuration
validate_config() {
    print_status "Validating cloud configuration..."
    
    local config_file=""
    case $CLOUD_PROVIDER in
        "aws")
            config_file="./cloud-configs/aws/cloudformation.yml"
            ;;
        "railway")
            config_file="./cloud-configs/railway/railway.json"
            ;;
        *)
            print_error "Validation not implemented for $CLOUD_PROVIDER"
            return 1
            ;;
    esac
    
    if [ ! -f "$config_file" ]; then
        print_error "Configuration file not found: $config_file"
        print_status "Run: $0 prepare --provider $CLOUD_PROVIDER"
        return 1
    fi
    
    # Validate environment variables
    local required_vars=()
    case $DEPLOYMENT_TARGET in
        "production")
            required_vars=("NEXTAUTH_SECRET" "DATABASE_URL" "REDIS_URL")
            ;;
        "staging")
            required_vars=("NEXTAUTH_SECRET")
            ;;
    esac
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    print_success "Configuration validation passed"
}

# Execute migration
execute_migration() {
    print_status "Executing migration to $CLOUD_PROVIDER ($DEPLOYMENT_TARGET)..."
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Run cloud-specific deployment
    local deploy_script="./cloud-configs/$CLOUD_PROVIDER/deploy.sh"
    if [ -f "$deploy_script" ]; then
        if [ "$DRY_RUN" = true ]; then
            print_status "Would execute: $deploy_script"
        else
            bash "$deploy_script"
        fi
    else
        print_error "Deploy script not found: $deploy_script"
        return 1
    fi
    
    print_success "Migration completed!"
}

# Main command dispatcher
main() {
    case "${COMMAND:-help}" in
        "prepare")
            validate_prerequisites
            backup_data
            generate_cloud_config
            ;;
        "backup")
            backup_data
            ;;
        "validate")
            validate_config
            ;;
        "migrate")
            validate_prerequisites
            validate_config
            backup_data
            execute_migration
            ;;
        "rollback")
            print_status "Rollback functionality not yet implemented"
            print_status "Please restore from backup: $BACKUP_DIR"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Parse arguments and run
parse_args "$@"

# Validate required parameters
if [ -n "$COMMAND" ] && [ "$COMMAND" != "help" ]; then
    if [ -z "$CLOUD_PROVIDER" ]; then
        print_error "Cloud provider is required. Use --provider option."
        exit 1
    fi
    
    if [ -z "$DEPLOYMENT_TARGET" ]; then
        DEPLOYMENT_TARGET="staging"
        print_warning "No deployment target specified, defaulting to staging"
    fi
fi

main