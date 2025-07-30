#!/usr/bin/env python3
"""
Secure Voice Data Transfer System
Manages encrypted upload/download between local RTX 5090 and cloud training
"""

import os
import sys
import json
import base64
import zipfile
import shutil
import hashlib
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    logging.warning("Cryptography not available. Install with: pip install cryptography")

import requests
from flask import Flask, request, jsonify, send_file
import threading
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecureVoiceTransfer:
    def __init__(self, voice_dir: str = "/home/luke/personal-ai-clone/web/public/voices"):
        self.voice_dir = Path(voice_dir)
        self.temp_dir = Path(tempfile.mkdtemp(prefix="voice_transfer_"))
        self.encryption_key = None
        self.server = None
        self.server_thread = None
        
        if not CRYPTO_AVAILABLE:
            logger.error("Cryptography library required. Install with: pip install cryptography")
            sys.exit(1)
    
    def generate_encryption_key(self, password: str = None) -> str:
        """Generate encryption key from password or create random key."""
        if password:
            # Derive key from password
            password_bytes = password.encode()
            salt = b'voice_training_salt_2024'  # In production, use random salt
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(password_bytes))
        else:
            # Generate random key
            key = Fernet.generate_key()
        
        self.encryption_key = key
        return key.decode()
    
    def encrypt_data(self, data: bytes) -> bytes:
        """Encrypt data using Fernet encryption."""
        if not self.encryption_key:
            raise ValueError("No encryption key set")
        
        fernet = Fernet(self.encryption_key)
        return fernet.encrypt(data)
    
    def decrypt_data(self, encrypted_data: bytes) -> bytes:
        """Decrypt data using Fernet encryption."""
        if not self.encryption_key:
            raise ValueError("No encryption key set")
        
        fernet = Fernet(self.encryption_key)
        return fernet.decrypt(encrypted_data)
    
    def package_voice_data(self, user_id: str) -> Optional[Path]:
        """Package user's voice data for cloud training."""
        try:
            logger.info(f"Packaging voice data for user: {user_id}")
            
            user_voice_dir = self.voice_dir / user_id
            if not user_voice_dir.exists():
                logger.error(f"No voice directory found for user: {user_id}")
                return None
            
            # Find voice files
            voice_files = []
            for pattern in ["*.wav", "*.webm", "*.mp3"]:
                voice_files.extend(user_voice_dir.glob(pattern))
            
            if not voice_files:
                logger.error(f"No voice files found for user: {user_id}")
                return None
            
            logger.info(f"Found {len(voice_files)} voice files")
            
            # Create package
            package_dir = self.temp_dir / f"voice_package_{user_id}"
            package_dir.mkdir(parents=True, exist_ok=True)
            
            # Copy and validate voice files
            processed_files = []
            for voice_file in voice_files:
                try:
                    # Copy to package directory
                    dest_path = package_dir / voice_file.name
                    shutil.copy2(voice_file, dest_path)
                    processed_files.append({
                        "filename": voice_file.name,
                        "size": voice_file.stat().st_size,
                        "modified": voice_file.stat().st_mtime
                    })
                except Exception as e:
                    logger.warning(f"Failed to package {voice_file.name}: {e}")
            
            if not processed_files:
                logger.error("No files successfully packaged")
                return None
            
            # Create metadata
            metadata = {
                "user_id": user_id,
                "package_created": datetime.now().isoformat(),
                "files": processed_files,
                "total_files": len(processed_files),
                "source_system": "local_rtx5090"
            }
            
            metadata_path = package_dir / "metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Create ZIP archive
            zip_path = self.temp_dir / f"voice_data_{user_id}_{int(time.time())}.zip"
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in package_dir.rglob('*'):
                    if file_path.is_file():
                        arcname = str(file_path.relative_to(package_dir))
                        zipf.write(file_path, arcname)
            
            logger.info(f"Voice data packaged: {zip_path.name} ({zip_path.stat().st_size / 1e6:.1f} MB)")
            return zip_path
            
        except Exception as e:
            logger.error(f"Failed to package voice data: {e}")
            return None
    
    def encrypt_package(self, package_path: Path, output_path: Optional[Path] = None) -> Optional[Path]:
        """Encrypt a voice data package."""
        try:
            if not self.encryption_key:
                self.generate_encryption_key()
            
            # Read package data
            with open(package_path, 'rb') as f:
                package_data = f.read()
            
            # Encrypt
            encrypted_data = self.encrypt_data(package_data)
            
            # Save encrypted package
            if not output_path:
                output_path = package_path.with_suffix('.encrypted')
            
            with open(output_path, 'wb') as f:
                f.write(encrypted_data)
            
            logger.info(f"Package encrypted: {output_path.name}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to encrypt package: {e}")
            return None
    
    def start_transfer_server(self, port: int = 8080, host: str = "127.0.0.1"):
        """Start local server for secure voice data transfer."""
        app = Flask(__name__)
        
        @app.route('/health', methods=['GET'])
        def health_check():
            return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})
        
        @app.route('/voice/download/<user_id>', methods=['GET'])
        def download_voice_data(user_id: str):
            """Securely download voice data for training."""
            try:
                # Authenticate request (in production, use proper auth)
                auth_token = request.headers.get('Authorization')
                if not auth_token or auth_token != f"Bearer voice_training_{user_id}":
                    return jsonify({"error": "Unauthorized"}), 401
                
                # Package voice data
                package_path = self.package_voice_data(user_id)
                if not package_path:
                    return jsonify({"error": "Failed to package voice data"}), 500
                
                # Encrypt package
                encrypted_path = self.encrypt_package(package_path)
                if not encrypted_path:
                    return jsonify({"error": "Failed to encrypt package"}), 500
                
                # Return encrypted package
                return send_file(
                    encrypted_path,
                    as_attachment=True,
                    download_name=f"voice_data_{user_id}_encrypted.zip",
                    mimetype="application/octet-stream"
                )
                
            except Exception as e:
                logger.error(f"Download failed: {e}")
                return jsonify({"error": str(e)}), 500
        
        @app.route('/voice/upload', methods=['POST'])
        def upload_trained_model():
            """Receive trained model from cloud."""
            try:
                # Authenticate request
                auth_token = request.headers.get('Authorization')
                if not auth_token:
                    return jsonify({"error": "Unauthorized"}), 401
                
                # Get uploaded file
                if 'model_file' not in request.files:
                    return jsonify({"error": "No model file provided"}), 400
                
                file = request.files['model_file']
                user_id = request.form.get('user_id')
                encryption_key = request.form.get('encryption_key')
                
                if not user_id:
                    return jsonify({"error": "No user_id provided"}), 400
                
                # Save uploaded file
                temp_path = self.temp_dir / f"uploaded_model_{int(time.time())}.zip"
                file.save(temp_path)
                
                # Decrypt if encryption key provided
                if encryption_key:
                    self.encryption_key = encryption_key.encode()
                    try:
                        with open(temp_path, 'rb') as f:
                            encrypted_data = f.read()
                        
                        decrypted_data = self.decrypt_data(encrypted_data)
                        
                        with open(temp_path, 'wb') as f:
                            f.write(decrypted_data)
                        
                        logger.info("Model decrypted successfully")\n                    except Exception as e:\n                        return jsonify({"error": f"Decryption failed: {e}"}), 400\n                \n                # Install model\n                success = self.install_trained_model(temp_path, user_id)\n                \n                if success:\n                    return jsonify({\n                        "success": True,\n                        "message": "Model installed successfully",\n                        "user_id": user_id\n                    })\n                else:\n                    return jsonify({"error": "Failed to install model"}), 500\n                    \n            except Exception as e:\n                logger.error(f"Upload failed: {e}")\n                return jsonify({"error": str(e)}), 500\n        \n        self.server = app\n        \n        def run_server():\n            app.run(host=host, port=port, debug=False)\n        \n        self.server_thread = threading.Thread(target=run_server, daemon=True)\n        self.server_thread.start()\n        \n        logger.info(f"Transfer server started on {host}:{port}")\n        logger.info(f"Voice download endpoint: http://{host}:{port}/voice/download/<user_id>")\n        logger.info(f"Model upload endpoint: http://{host}:{port}/voice/upload")\n    \n    def install_trained_model(self, model_path: Path, user_id: str) -> bool:\n        """Install trained model into local system."""\n        try:\n            logger.info(f"Installing trained model for {user_id}...")\n            \n            # Create models directory\n            models_dir = Path("/home/luke/personal-ai-clone/models/voices")\n            models_dir.mkdir(parents=True, exist_ok=True)\n            \n            user_models_dir = models_dir / user_id\n            user_models_dir.mkdir(parents=True, exist_ok=True)\n            \n            # Extract model package\n            with zipfile.ZipFile(model_path, 'r') as zipf:\n                extract_dir = self.temp_dir / f"extract_{user_id}"\n                zipf.extractall(extract_dir)\n            \n            # Find model directory (should contain metadata.json)\n            model_dirs = [d for d in extract_dir.iterdir() if d.is_dir()]\n            if not model_dirs:\n                logger.error("No model directory found in package")\n                return False\n            \n            source_model_dir = model_dirs[0]\n            \n            # Validate model package\n            metadata_file = source_model_dir / "metadata.json"\n            if not metadata_file.exists():\n                logger.error("No metadata.json found in model package")\n                return False\n            \n            with open(metadata_file, 'r') as f:\n                metadata = json.load(f)\n            \n            # Copy model to final location\n            model_version = metadata.get("model_version", f"model_{int(time.time())}")\n            final_model_dir = user_models_dir / model_version\n            \n            if final_model_dir.exists():\n                shutil.rmtree(final_model_dir)\n            \n            shutil.copytree(source_model_dir, final_model_dir)\n            \n            # Create symlink to latest model\n            latest_link = user_models_dir / "latest"\n            if latest_link.exists() or latest_link.is_symlink():\n                latest_link.unlink()\n            latest_link.symlink_to(model_version)\n            \n            logger.info(f"✅ Model installed: {final_model_dir}")\n            logger.info(f"🔗 Latest model link updated")\n            \n            return True\n            \n        except Exception as e:\n            logger.error(f"Failed to install model: {e}")\n            return False\n    \n    def cleanup(self):\n        """Clean up temporary files."""\n        if self.temp_dir.exists():\n            shutil.rmtree(self.temp_dir, ignore_errors=True)\n            logger.info("🗑️ Temporary files cleaned up")\n\ndef main():\n    \"\"\"Command line interface for secure transfer.\"\"\"\n    import argparse\n    \n    parser = argparse.ArgumentParser(description="Secure Voice Data Transfer")\n    parser.add_argument("command", choices=["server", "package", "encrypt"], \n                       help="Command to execute")\n    parser.add_argument("--user-id", required=False, help="User ID for voice data")\n    parser.add_argument("--port", type=int, default=8080, help="Server port")\n    parser.add_argument("--host", default="127.0.0.1", help="Server host")\n    parser.add_argument("--password", help="Encryption password")\n    \n    args = parser.parse_args()\n    \n    transfer = SecureVoiceTransfer()\n    \n    try:\n        if args.command == "server":\n            print(f"🚀 Starting secure transfer server on {args.host}:{args.port}...")\n            transfer.start_transfer_server(args.port, args.host)\n            print("✅ Server started. Press Ctrl+C to stop.")\n            \n            try:\n                while True:\n                    time.sleep(1)\n            except KeyboardInterrupt:\n                print("\\n🛑 Server stopped")\n                \n        elif args.command == "package":\n            if not args.user_id:\n                print("❌ --user-id required for package command")\n                return\n            \n            print(f"📦 Packaging voice data for {args.user_id}...")\n            package_path = transfer.package_voice_data(args.user_id)\n            \n            if package_path:\n                print(f"✅ Package created: {package_path}")\n                \n                if args.password:\n                    transfer.generate_encryption_key(args.password)\n                    encrypted_path = transfer.encrypt_package(package_path)\n                    if encrypted_path:\n                        print(f"🔒 Encrypted package: {encrypted_path}")\n            else:\n                print("❌ Failed to create package")\n                \n        elif args.command == "encrypt":\n            if not args.user_id:\n                print("❌ --user-id required for encrypt command")\n                return\n            \n            print(f"🔐 Generating encryption key for {args.user_id}...")\n            key = transfer.generate_encryption_key(args.password)\n            print(f"🔑 Encryption key: {key}")\n            print("⚠️ Store this key securely - you'll need it for decryption")\n    \n    finally:\n        transfer.cleanup()\n\nif __name__ == "__main__":\n    main()\n