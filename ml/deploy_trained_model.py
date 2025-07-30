#!/usr/bin/env python3
"""
Deploy Trained Voice Model from Google Colab
"""

import os
import zipfile
import json
import shutil
from pathlib import Path
import sys

class ModelDeployer:
    def __init__(self):
        self.project_root = Path("/home/luke/personal-ai-clone")
        self.models_dir = self.project_root / "models/voices"
        self.models_dir.mkdir(parents=True, exist_ok=True)
    
    def deploy_model(self, model_zip_path):
        """Deploy a trained model from Google Colab"""
        model_zip = Path(model_zip_path)
        
        if not model_zip.exists():
            print(f"❌ Model file not found: {model_zip_path}")
            return False
        
        print(f"🚀 Deploying trained model: {model_zip.name}")
        
        # Extract model
        temp_dir = self.models_dir / "temp_extract"
        temp_dir.mkdir(exist_ok=True)
        
        try:
            with zipfile.ZipFile(model_zip, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            # Read model info
            model_info_file = temp_dir / "model_info.json"
            if model_info_file.exists():
                with open(model_info_file, 'r') as f:
                    model_info = json.load(f)
                
                user_id = model_info.get("user_id", "unknown")
                model_type = model_info.get("model_type", "xtts_v2")
                
                print(f"📊 Model info: {model_info['voice_name']} ({user_id})")
                print(f"🎯 Model type: {model_type}")
                print(f"⭐ Quality score: {model_info.get('quality_score', 'unknown')}")
            else:
                print("⚠️ No model info found, using defaults")
                user_id = "lukemoeller_yahoo_com"
                model_type = "xtts_v2_trained"
            
            # Create deployment directory
            user_models_dir = self.models_dir / user_id
            user_models_dir.mkdir(exist_ok=True)
            
            # Create timestamped model directory
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            model_dir = user_models_dir / f"{model_type}_{timestamp}"
            
            # Move model files
            shutil.move(temp_dir, model_dir)
            
            # Update latest symlink
            latest_link = user_models_dir / "latest"
            if latest_link.exists():
                latest_link.unlink()
            latest_link.symlink_to(model_dir.name)
            
            print(f"✅ Model deployed to: {model_dir}")
            print(f"🔗 Latest model link: {latest_link}")
            
            # Update voice cloner configuration
            self.update_voice_cloner_config(user_id, model_dir)
            
            print("\n🎯 Next steps:")
            print("1. Restart your Docker container: docker-compose restart ml-inference")
            print("2. Test voice synthesis through your web interface")
            print("3. The improved voice model should now be active!")
            
            return True
            
        except Exception as e:
            print(f"❌ Deployment failed: {e}")
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
            return False
    
    def update_voice_cloner_config(self, user_id, model_dir):
        """Update voice cloner to use the new model"""
        try:
            # Create model registry entry
            registry_file = self.models_dir / "model_registry.json"
            
            registry = {}
            if registry_file.exists():
                with open(registry_file, 'r') as f:
                    registry = json.load(f)
            
            if user_id not in registry:
                registry[user_id] = {"models": []}
            
            model_entry = {
                "path": str(model_dir),
                "timestamp": model_dir.name.split("_")[-1],
                "active": True,
                "quality_score": 0.85
            }
            
            # Deactivate old models
            for model in registry[user_id]["models"]:
                model["active"] = False
            
            # Add new model
            registry[user_id]["models"].append(model_entry)
            
            with open(registry_file, 'w') as f:
                json.dump(registry, f, indent=2)
            
            print(f"📝 Updated model registry: {registry_file}")
            
        except Exception as e:
            print(f"⚠️ Failed to update registry: {e}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 deploy_trained_model.py <model_zip_file>")
        print("Example: python3 deploy_trained_model.py lukemoeller_voice_model.zip")
        sys.exit(1)
    
    model_zip = sys.argv[1]
    deployer = ModelDeployer()
    
    if deployer.deploy_model(model_zip):
        print("\n🎉 Model deployment successful!")
    else:
        print("\n❌ Model deployment failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()