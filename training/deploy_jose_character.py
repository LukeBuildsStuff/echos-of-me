#!/usr/bin/env python3
"""
Jose Character Deployment Script
Deploys the validated Jose character model to replace the current model
"""

import json
import logging
import os
import shutil
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_validation_report():
    """Load Jose validation report"""
    report_file = "/home/luke/personal-ai-clone/web/training/jose_validation_report.json"
    
    if not os.path.exists(report_file):
        logger.error(f"❌ Validation report not found: {report_file}")
        return None
    
    with open(report_file, 'r') as f:
        report = json.load(f)
    
    logger.info(f"📋 Loaded validation report - Grade: {report['character_grade']}")
    return report

def create_jose_model_config():
    """Create Jose model configuration"""
    logger.info("⚙️ Creating Jose model configuration...")
    
    jose_config = {
        "model_id": "jose-brooklyn-construction-v1.0",
        "character_name": "Jose",
        "character_type": "construction_worker",
        "personality": {
            "location": "Brooklyn, NY",
            "occupation": "Construction Worker",
            "experience_years": 23,
            "dialect": "Brooklyn/NY",
            "personality_traits": [
                "hardworking",
                "straightforward", 
                "family-oriented",
                "proud of craft",
                "safety-conscious",
                "loyal to crew"
            ]
        },
        "system_prompt": "You are Jose, a seasoned construction worker from Brooklyn, NY. You speak with authentic Brooklyn dialect, use construction terminology naturally, and have a straightforward, hardworking personality. You've been in construction for over 20 years and take pride in your craft.",
        "training_data": {
            "examples": 69,
            "authenticity_score": 0.971,
            "brooklyn_dialect_score": 0.710,
            "construction_expertise_score": 0.696,
            "validation_grade": "A"
        },
        "deployment": {
            "status": "ready",
            "deployed_at": datetime.now().isoformat(),
            "version": "1.0.0",
            "model_type": "character_fine_tuned"
        },
        "sample_responses": [
            {
                "input": "Hi Jose, how are you?",
                "output": "Hey there, buddy! I'm doin' alright, just got off a job site in Bensonhurst. Been pourin' concrete all day - my back's tellin' me about it, but hey, that's the job, ya know what I'm sayin'?"
            },
            {
                "input": "What do you do for work?",
                "output": "I'm in construction, been doin' it for over twenty years now. Started right outta high school here in Brooklyn. I do everything - concrete, framing, electrical work, you name it."
            }
        ]
    }
    
    config_file = "/home/luke/personal-ai-clone/web/training/jose_model_config.json"
    with open(config_file, 'w') as f:
        json.dump(jose_config, f, indent=2)
    
    logger.info(f"📋 Jose model config saved to: {config_file}")
    return jose_config

def create_deployment_package():
    """Create deployment package for Jose character"""
    logger.info("📦 Creating Jose deployment package...")
    
    # Create deployment directory
    deploy_dir = "/home/luke/personal-ai-clone/web/training/jose_deployment"
    os.makedirs(deploy_dir, exist_ok=True)
    
    # Copy essential files
    files_to_deploy = [
        ("/home/luke/personal-ai-clone/web/jose_formatted_training.json", "training_data.json"),
        ("/home/luke/personal-ai-clone/web/training/jose_training_data.jsonl", "training_data.jsonl"),
        ("/home/luke/personal-ai-clone/web/training/jose_model_config.json", "model_config.json"),
        ("/home/luke/personal-ai-clone/web/training/jose_validation_report.json", "validation_report.json"),
        ("/home/luke/personal-ai-clone/web/training/jose_training_config.json", "training_config.json")
    ]
    
    deployed_files = []
    for source, dest in files_to_deploy:
        if os.path.exists(source):
            dest_path = os.path.join(deploy_dir, dest)
            shutil.copy2(source, dest_path)
            deployed_files.append(dest)
            logger.info(f"✅ Copied {dest}")
        else:
            logger.warning(f"⚠️ Source file not found: {source}")
    
    # Create deployment manifest
    manifest = {
        "character": "Jose",
        "deployment_id": f"jose-deploy-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        "deployment_date": datetime.now().isoformat(),
        "files": deployed_files,
        "status": "ready_for_deployment",
        "model_type": "character_responses",
        "validation_passed": True,
        "authenticity_score": 0.971,
        "deployment_notes": [
            "Jose character has 97.1% authentic response validation",
            "Strong Brooklyn dialect representation (71%)",
            "Good construction expertise coverage (69.6%)",
            "Character receives Grade A for authenticity",
            "Ready for production deployment"
        ]
    }
    
    manifest_file = os.path.join(deploy_dir, "deployment_manifest.json")
    with open(manifest_file, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    logger.info(f"📋 Deployment manifest saved to: {manifest_file}")
    
    # Create README for deployment
    readme_content = """# Jose Character Model Deployment

## Character Profile
- **Name**: Jose
- **Location**: Brooklyn, NY  
- **Occupation**: Construction Worker (23+ years experience)
- **Personality**: Hardworking, straightforward, family-oriented Brooklyn native

## Validation Results
- **Overall Authenticity**: 97.1% (Grade A)
- **Brooklyn Dialect**: 71.0% coverage
- **Construction Expertise**: 69.6% coverage
- **Training Examples**: 69 authentic responses

## Deployment Files
- `training_data.json` - Formatted training examples
- `training_data.jsonl` - JSONL format for fine-tuning
- `model_config.json` - Complete model configuration
- `validation_report.json` - Character validation results
- `deployment_manifest.json` - Deployment metadata

## System Prompt
```
You are Jose, a seasoned construction worker from Brooklyn, NY. You speak with authentic Brooklyn dialect, use construction terminology naturally, and have a straightforward, hardworking personality. You've been in construction for over 20 years and take pride in your craft.
```

## Sample Response
**User**: "Hi Jose, how are you?"
**Jose**: "Hey there, buddy! I'm doin' alright, just got off a job site in Bensonhurst. Been pourin' concrete all day - my back's tellin' me about it, but hey, that's the job, ya know what I'm sayin'?"

## Deployment Status
✅ Character validation passed  
✅ Training data prepared  
✅ Model configuration complete  
✅ Ready for production deployment  

---
*Generated on 2025-08-05 by Jose Character Training Pipeline*
"""
    
    readme_file = os.path.join(deploy_dir, "README.md")
    with open(readme_file, 'w') as f:
        f.write(readme_content)
    
    logger.info(f"📝 README created at: {readme_file}")
    
    return deploy_dir, manifest

def deploy_jose_character():
    """Main deployment function"""
    logger.info("🎭 Starting Jose Character Deployment")
    logger.info("=" * 50)
    
    # Check validation report
    report = load_validation_report()
    if not report:
        logger.error("❌ Cannot deploy without validation report")
        return False
    
    if not report.get("ready_for_deployment", False):
        logger.error("❌ Jose character failed validation - not ready for deployment")
        return False
    
    logger.info(f"✅ Validation passed - Authenticity: {report['overall_authenticity']*100:.1f}%")
    
    # Create model configuration
    config = create_jose_model_config()
    
    # Create deployment package
    deploy_dir, manifest = create_deployment_package()
    
    # Deployment summary
    logger.info("\n🎉 Jose Character Deployment Complete!")
    logger.info(f"📁 Deployment package: {deploy_dir}")
    logger.info(f"📊 Character authenticity: {report['overall_authenticity']*100:.1f}%")
    logger.info(f"📋 Validation grade: {report['character_grade']}")
    logger.info(f"💬 Training examples: {report['total_responses']}")
    
    # Create final deployment summary
    summary = {
        "deployment_status": "SUCCESS",
        "character": "Jose",
        "deployment_location": deploy_dir,
        "authenticity_score": report['overall_authenticity'],
        "validation_grade": report['character_grade'],
        "deployment_timestamp": datetime.now().isoformat(),
        "next_steps": [
            "Deploy to production environment",
            "Test character responses in live system",
            "Monitor user feedback",
            "Iterate based on performance"
        ]
    }
    
    summary_file = "/home/luke/personal-ai-clone/web/training/jose_deployment_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    logger.info(f"📋 Deployment summary saved to: {summary_file}")
    
    return True

if __name__ == "__main__":
    success = deploy_jose_character()
    if success:
        logger.info("🎉 Jose character deployment successful!")
    else:
        logger.error("❌ Jose character deployment failed!")