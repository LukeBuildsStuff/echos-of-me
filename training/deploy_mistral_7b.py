#!/usr/bin/env python3
"""
Mistral 7B Deployment Script for RTX 5090
Author: Claude Code (Deployment Specialist)

This script handles the deployment of trained Mistral 7B models:
- Validates trained model checkpoints
- Deploys to inference engine
- Creates integration endpoints
- Performs deployment testing
"""

import os
import sys
import json
import logging
import torch
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Training imports for model loading
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    BitsAndBytesConfig
)
from peft import PeftModel, LoraConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/training/mistral_deployment.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class MistralDeploymentManager:
    """Manages deployment of trained Mistral 7B models"""
    
    def __init__(self):
        self.base_model_name = "mistralai/Mistral-7B-Instruct-v0.3"
        self.deployment_paths = {
            'models': '/training/deployed_models',
            'configs': '/training/deployed_configs',
            'logs': '/training/deployment_logs'
        }
        self.setup_deployment_environment()
        
    def setup_deployment_environment(self):
        """Setup deployment directory structure"""
        logger.info("Setting up Mistral 7B deployment environment...")
        
        for path_type, path in self.deployment_paths.items():
            os.makedirs(path, exist_ok=True)
            logger.info(f"Created {path_type} directory: {path}")
            
    def validate_trained_model(self, model_path: str) -> Dict:
        """Validate a trained Mistral 7B model checkpoint"""
        logger.info(f"Validating Mistral 7B model: {model_path}")
        
        validation_results = {
            'model_path': model_path,
            'validation_status': 'pending',
            'errors': [],
            'warnings': [],
            'model_info': {},
            'performance_metrics': {}
        }
        
        try:
            # Check if model directory exists
            if not os.path.exists(model_path):
                validation_results['errors'].append(f"Model path does not exist: {model_path}")
                validation_results['validation_status'] = 'failed'
                return validation_results
                
            # Check for required files
            required_files = [
                'adapter_config.json',
                'adapter_model.safetensors',
                'tokenizer.json',
                'tokenizer_config.json'
            ]
            
            missing_files = []
            for file_name in required_files:
                file_path = os.path.join(model_path, file_name)
                if not os.path.exists(file_path):
                    missing_files.append(file_name)
                    
            if missing_files:
                validation_results['errors'].append(f"Missing required files: {missing_files}")
                validation_results['validation_status'] = 'failed'
                return validation_results
                
            # Load and validate adapter configuration
            adapter_config_path = os.path.join(model_path, 'adapter_config.json')
            with open(adapter_config_path, 'r') as f:
                adapter_config = json.load(f)
                
            validation_results['model_info']['adapter_config'] = adapter_config
            
            # Validate LoRA configuration
            expected_target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
            actual_target_modules = adapter_config.get('target_modules', [])
            
            if not all(module in expected_target_modules for module in actual_target_modules):
                validation_results['warnings'].append(
                    f"Unexpected target modules: {actual_target_modules}"
                )
                
            # Load training metadata if available
            metadata_path = os.path.join(model_path, 'training_metadata.json')
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    training_metadata = json.load(f)
                validation_results['model_info']['training_metadata'] = training_metadata
                
            # Test model loading
            logger.info("Testing Mistral 7B model loading...")
            self._test_model_loading(model_path, validation_results)
            
            # Mark validation as successful if no errors
            if not validation_results['errors']:
                validation_results['validation_status'] = 'passed'
                logger.info("Mistral 7B model validation passed ✓")
            else:
                validation_results['validation_status'] = 'failed'
                logger.error(f"Mistral 7B model validation failed: {validation_results['errors']}")
                
        except Exception as e:
            validation_results['errors'].append(f"Validation exception: {str(e)}")
            validation_results['validation_status'] = 'failed'
            logger.error(f"Model validation exception: {e}")
            
        return validation_results
        
    def _test_model_loading(self, model_path: str, validation_results: Dict):
        """Test loading the Mistral 7B model"""
        try:
            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            validation_results['model_info']['tokenizer_vocab_size'] = tokenizer.vocab_size
            
            # Load base model with quantization for memory efficiency
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16
            )
            
            base_model = AutoModelForCausalLM.from_pretrained(
                self.base_model_name,
                quantization_config=bnb_config,
                device_map="auto",
                torch_dtype=torch.bfloat16,
                trust_remote_code=True
            )
            
            # Load LoRA adapter
            model = PeftModel.from_pretrained(base_model, model_path)
            
            # Test basic inference
            test_prompt = "[INST] Hello, who are you? [/INST]"
            inputs = tokenizer(test_prompt, return_tensors="pt")
            
            if torch.cuda.is_available():
                inputs = {k: v.to(model.device) for k, v in inputs.items()}
                
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=50,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id
                )
                
            response = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
            validation_results['performance_metrics']['test_response'] = response.strip()
            
            # Get model parameter count
            total_params = sum(p.numel() for p in model.parameters())
            trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
            
            validation_results['model_info']['total_parameters'] = total_params
            validation_results['model_info']['trainable_parameters'] = trainable_params
            validation_results['model_info']['trainable_percentage'] = (trainable_params / total_params) * 100
            
            logger.info(f"Model loading test passed - Generated response: {response.strip()}")
            
        except Exception as e:
            validation_results['errors'].append(f"Model loading test failed: {str(e)}")
            logger.error(f"Model loading test failed: {e}")
            
    def deploy_model(self, model_path: str, deployment_name: str, user_id: str = None) -> Dict:
        """Deploy a validated Mistral 7B model"""
        logger.info(f"Deploying Mistral 7B model: {deployment_name}")
        
        deployment_result = {
            'deployment_name': deployment_name,
            'deployment_status': 'pending',
            'deployment_path': None,
            'config_path': None,
            'user_id': user_id,
            'deployed_at': datetime.now().isoformat(),
            'errors': [],
            'warnings': []
        }
        
        try:
            # Validate model first
            validation_results = self.validate_trained_model(model_path)
            if validation_results['validation_status'] != 'passed':
                deployment_result['errors'].append("Model validation failed")
                deployment_result['deployment_status'] = 'failed'
                return deployment_result
                
            # Create deployment directory
            deployment_dir = os.path.join(self.deployment_paths['models'], deployment_name)
            os.makedirs(deployment_dir, exist_ok=True)
            
            # Copy model files
            logger.info(f"Copying model files to deployment directory: {deployment_dir}")
            for file_name in os.listdir(model_path):
                src_file = os.path.join(model_path, file_name)
                dst_file = os.path.join(deployment_dir, file_name)
                
                if os.path.isfile(src_file):
                    shutil.copy2(src_file, dst_file)
                    
            deployment_result['deployment_path'] = deployment_dir
            
            # Create deployment configuration
            config_path = self._create_deployment_config(deployment_name, deployment_dir, validation_results, user_id)
            deployment_result['config_path'] = config_path
            
            # Test deployed model
            test_results = self._test_deployed_model(deployment_dir)
            if test_results['test_status'] == 'passed':
                deployment_result['deployment_status'] = 'completed'
                logger.info(f"Mistral 7B model deployed successfully: {deployment_name}")
            else:
                deployment_result['errors'].extend(test_results['errors'])
                deployment_result['deployment_status'] = 'failed'
                
        except Exception as e:
            deployment_result['errors'].append(f"Deployment exception: {str(e)}")
            deployment_result['deployment_status'] = 'failed'
            logger.error(f"Deployment exception: {e}")
            
        return deployment_result
        
    def _create_deployment_config(self, deployment_name: str, deployment_path: str, validation_results: Dict, user_id: str = None) -> str:
        """Create deployment configuration file"""
        config = {
            'deployment_name': deployment_name,
            'model_type': 'mistral-7b-lora',
            'base_model': self.base_model_name,
            'deployment_path': deployment_path,
            'user_id': user_id,
            'deployed_at': datetime.now().isoformat(),
            'model_info': validation_results.get('model_info', {}),
            'inference_config': {
                'max_new_tokens': 512,
                'temperature': 0.7,
                'top_p': 0.9,
                'do_sample': True,
                'repetition_penalty': 1.1,
                'pad_token_id': 2,  # Mistral EOS token
                'eos_token_id': 2
            },
            'hardware_config': {
                'use_4bit_quantization': True,
                'torch_dtype': 'bfloat16',
                'device_map': 'auto',
                'flash_attention_2': True
            },
            'chat_template': "[INST] {prompt} [/INST]",
            'system_prompt': "You are a helpful AI assistant trained to provide thoughtful, accurate, and engaging responses.",
            'validation_results': validation_results
        }
        
        config_path = os.path.join(self.deployment_paths['configs'], f"{deployment_name}_config.json")
        
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
            
        logger.info(f"Deployment configuration created: {config_path}")
        return config_path
        
    def _test_deployed_model(self, deployment_path: str) -> Dict:
        """Test a deployed Mistral 7B model"""
        logger.info("Testing deployed Mistral 7B model...")
        
        test_result = {
            'test_status': 'pending',
            'errors': [],
            'test_responses': []
        }
        
        try:
            # Load deployed model
            tokenizer = AutoTokenizer.from_pretrained(deployment_path)
            
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16
            )
            
            base_model = AutoModelForCausalLM.from_pretrained(
                self.base_model_name,
                quantization_config=bnb_config,
                device_map="auto",
                torch_dtype=torch.bfloat16
            )
            
            model = PeftModel.from_pretrained(base_model, deployment_path)
            
            # Test prompts
            test_prompts = [
                "Tell me about yourself.",
                "What are your favorite memories?",
                "How do you handle difficult situations?",
                "What advice would you give to future generations?"
            ]
            
            model.eval()
            for prompt in test_prompts:
                formatted_prompt = f"[INST] {prompt} [/INST]"
                inputs = tokenizer(formatted_prompt, return_tensors="pt")
                
                if torch.cuda.is_available():
                    inputs = {k: v.to(model.device) for k, v in inputs.items()}
                    
                with torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_new_tokens=100,
                        temperature=0.7,
                        do_sample=True,
                        pad_token_id=tokenizer.eos_token_id
                    )
                    
                response = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
                
                test_result['test_responses'].append({
                    'prompt': prompt,
                    'response': response.strip()
                })
                
                logger.info(f"Test prompt: {prompt}")
                logger.info(f"Response: {response.strip()}")
                logger.info("---")
                
            test_result['test_status'] = 'passed'
            logger.info("Deployed model testing completed successfully ✓")
            
        except Exception as e:
            test_result['errors'].append(f"Model testing failed: {str(e)}")
            test_result['test_status'] = 'failed'
            logger.error(f"Deployed model testing failed: {e}")
            
        return test_result
        
    def list_deployed_models(self) -> List[Dict]:
        """List all deployed Mistral 7B models"""
        deployed_models = []
        
        models_dir = self.deployment_paths['models']
        if not os.path.exists(models_dir):
            return deployed_models
            
        for deployment_name in os.listdir(models_dir):
            deployment_path = os.path.join(models_dir, deployment_name)
            config_path = os.path.join(self.deployment_paths['configs'], f"{deployment_name}_config.json")
            
            if os.path.isdir(deployment_path):
                model_info = {
                    'deployment_name': deployment_name,
                    'deployment_path': deployment_path,
                    'config_path': config_path if os.path.exists(config_path) else None,
                    'deployed_at': None,
                    'user_id': None,
                    'model_type': 'mistral-7b-lora'
                }
                
                # Load config if available
                if os.path.exists(config_path):
                    try:
                        with open(config_path, 'r') as f:
                            config = json.load(f)
                            model_info['deployed_at'] = config.get('deployed_at')
                            model_info['user_id'] = config.get('user_id')
                    except Exception as e:
                        logger.warning(f"Failed to load config for {deployment_name}: {e}")
                        
                deployed_models.append(model_info)
                
        return deployed_models
        
    def undeploy_model(self, deployment_name: str) -> Dict:
        """Undeploy a Mistral 7B model"""
        logger.info(f"Undeploying Mistral 7B model: {deployment_name}")
        
        result = {
            'deployment_name': deployment_name,
            'undeploy_status': 'pending',
            'errors': []
        }
        
        try:
            # Remove model directory
            model_path = os.path.join(self.deployment_paths['models'], deployment_name)
            if os.path.exists(model_path):
                shutil.rmtree(model_path)
                logger.info(f"Removed model directory: {model_path}")
                
            # Remove config file
            config_path = os.path.join(self.deployment_paths['configs'], f"{deployment_name}_config.json")
            if os.path.exists(config_path):
                os.remove(config_path)
                logger.info(f"Removed config file: {config_path}")
                
            result['undeploy_status'] = 'completed'
            logger.info(f"Model undeployed successfully: {deployment_name}")
            
        except Exception as e:
            result['errors'].append(f"Undeploy exception: {str(e)}")
            result['undeploy_status'] = 'failed'
            logger.error(f"Undeploy exception: {e}")
            
        return result

def main():
    """Main deployment function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Deploy Mistral 7B models")
    parser.add_argument('action', choices=['validate', 'deploy', 'test', 'list', 'undeploy'], 
                       help='Action to perform')
    parser.add_argument('--model-path', required=False, 
                       help='Path to trained model (for validate/deploy)')
    parser.add_argument('--deployment-name', required=False, 
                       help='Name for deployment (for deploy/test/undeploy)')
    parser.add_argument('--user-id', required=False, 
                       help='User ID for deployment')
    
    args = parser.parse_args()
    
    manager = MistralDeploymentManager()
    
    if args.action == 'validate':
        if not args.model_path:
            print("Error: --model-path required for validate action")
            sys.exit(1)
            
        results = manager.validate_trained_model(args.model_path)
        print(json.dumps(results, indent=2))
        
    elif args.action == 'deploy':
        if not args.model_path or not args.deployment_name:
            print("Error: --model-path and --deployment-name required for deploy action")
            sys.exit(1)
            
        results = manager.deploy_model(args.model_path, args.deployment_name, args.user_id)
        print(json.dumps(results, indent=2))
        
    elif args.action == 'list':
        models = manager.list_deployed_models()
        print(json.dumps(models, indent=2))
        
    elif args.action == 'test':
        if not args.deployment_name:
            print("Error: --deployment-name required for test action")
            sys.exit(1)
            
        deployment_path = os.path.join(manager.deployment_paths['models'], args.deployment_name)
        results = manager._test_deployed_model(deployment_path)
        print(json.dumps(results, indent=2))
        
    elif args.action == 'undeploy':
        if not args.deployment_name:
            print("Error: --deployment-name required for undeploy action")
            sys.exit(1)
            
        results = manager.undeploy_model(args.deployment_name)
        print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()