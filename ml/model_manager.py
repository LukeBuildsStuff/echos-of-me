#!/usr/bin/env python3
"""
Voice Model Versioning and Management System
Manages version control, quality metrics, and lifecycle of voice models
"""

import os
import json
import shutil
import hashlib
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
import tempfile
import subprocess

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VoiceModelManager:
    def __init__(self, models_dir: str = "/models/voices", db_path: str = None):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
        # Database for model metadata and metrics
        if not db_path:
            db_path = self.models_dir / "model_registry.db"
        self.db_path = Path(db_path)
        
        self.init_database()
        
    def init_database(self):
        """Initialize SQLite database for model tracking."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create models table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS models (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_id TEXT UNIQUE NOT NULL,
                    user_id TEXT NOT NULL,
                    model_version TEXT NOT NULL,
                    model_type TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_hash TEXT NOT NULL,
                    file_size_mb REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    training_platform TEXT,
                    training_duration_minutes REAL,
                    training_samples INTEGER,
                    status TEXT DEFAULT 'active',
                    quality_score REAL,
                    performance_metrics TEXT,
                    notes TEXT
                )
            """)
            
            # Create model evaluations table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS evaluations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_id TEXT NOT NULL,
                    evaluation_type TEXT NOT NULL,
                    score REAL NOT NULL,
                    metrics TEXT,
                    evaluated_at TEXT NOT NULL,
                    evaluator TEXT,
                    notes TEXT,
                    FOREIGN KEY (model_id) REFERENCES models (model_id)
                )
            """)
            
            # Create model usage table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS usage_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_id TEXT NOT NULL,
                    used_at TEXT NOT NULL,
                    synthesis_time_ms REAL,
                    text_length INTEGER,
                    audio_length_seconds REAL,
                    success BOOLEAN,
                    error_message TEXT,
                    FOREIGN KEY (model_id) REFERENCES models (model_id)
                )
            """)
            
            conn.commit()
            conn.close()
            
            logger.info("✅ Model registry database initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
    
    def register_model(
        self, 
        model_path: Path, 
        user_id: str, 
        metadata: Dict[str, Any]
    ) -> Optional[str]:
        """Register a new model in the versioning system."""
        try:
            # Validate model files
            if not self._validate_model_package(model_path):
                logger.error(f"Invalid model package: {model_path}")
                return None
            
            # Load model metadata
            with open(model_path / "metadata.json", 'r') as f:
                model_metadata = json.load(f)
            
            model_version = model_metadata.get("model_version")
            model_type = model_metadata.get("model_type", "xtts_v2_finetuned")
            
            # Generate model ID
            model_id = f"{user_id}_{model_version}"
            
            # Create user directory
            user_dir = self.models_dir / user_id
            user_dir.mkdir(exist_ok=True)
            
            # Copy model to versioned location
            versioned_dir = user_dir / model_version
            if versioned_dir.exists():
                logger.warning(f"Model version {model_version} already exists, archiving...")
                self._archive_existing_model(versioned_dir)
            
            shutil.copytree(model_path, versioned_dir)
            
            # Calculate file hash for integrity checking
            file_hash = self._calculate_model_hash(versioned_dir)
            
            # Get file size
            file_size_mb = sum(
                f.stat().st_size for f in versioned_dir.rglob('*') if f.is_file()
            ) / 1e6
            
            # Register in database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO models (
                    model_id, user_id, model_version, model_type,
                    file_path, file_hash, file_size_mb, created_at,
                    training_platform, training_duration_minutes, training_samples
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                model_id, user_id, model_version, model_type,
                str(versioned_dir), file_hash, file_size_mb, 
                model_metadata.get("created_at", datetime.now().isoformat()),
                model_metadata.get("platform", "unknown"),
                metadata.get("training_duration_minutes"),
                model_metadata.get("training_samples")
            ))
            
            conn.commit()
            conn.close()
            
            # Update latest symlink
            self._update_latest_symlink(user_dir, model_version)
            
            logger.info(f"✅ Model registered: {model_id}")
            return model_id
            
        except Exception as e:
            logger.error(f"Failed to register model: {e}")
            return None
    
    def _validate_model_package(self, model_path: Path) -> bool:
        """Validate that model package contains required files."""
        required_files = ["metadata.json", "model.pth", "config.json"]
        return all((model_path / f).exists() for f in required_files)
    
    def _calculate_model_hash(self, model_dir: Path) -> str:
        """Calculate SHA256 hash of model files for integrity checking."""
        hasher = hashlib.sha256()
        
        # Hash in deterministic order
        for file_path in sorted(model_dir.rglob('*')):
            if file_path.is_file():
                with open(file_path, 'rb') as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        hasher.update(chunk)
        
        return hasher.hexdigest()
    
    def _archive_existing_model(self, model_dir: Path):
        """Archive an existing model version."""
        archive_dir = model_dir.parent / "archived"
        archive_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_path = archive_dir / f"{model_dir.name}_{timestamp}"
        
        shutil.move(model_dir, archive_path)
        logger.info(f"📦 Archived existing model to: {archive_path}")
    
    def _update_latest_symlink(self, user_dir: Path, model_version: str):
        """Update the 'latest' symlink to point to the newest model."""
        latest_link = user_dir / "latest"
        
        # Remove existing symlink
        if latest_link.exists() or latest_link.is_symlink():
            latest_link.unlink()
        
        # Create new symlink
        latest_link.symlink_to(model_version)
        logger.info(f"🔗 Updated latest model link: {model_version}")
    
    def evaluate_model(
        self, 
        model_id: str, 
        evaluation_type: str,
        test_texts: List[str] = None
    ) -> Dict[str, Any]:
        """Evaluate model quality using various metrics."""
        try:
            logger.info(f"🔍 Evaluating model: {model_id}")
            
            # Get model info
            model_info = self.get_model_info(model_id)
            if not model_info:
                return {"success": False, "error": "Model not found"}
            
            # Default test texts for evaluation
            if not test_texts:
                test_texts = [
                    "Hello, this is a test of the voice synthesis quality.",
                    "The quick brown fox jumps over the lazy dog.",
                    "Can you hear the difference in emotional tone and clarity?",
                    "Testing pronunciation with words like algorithm, phenomenon, and extraordinary.",
                    "This sentence tests natural prosody and rhythm in speech."
                ]
            
            evaluation_results = {
                "model_id": model_id,
                "evaluation_type": evaluation_type,
                "test_count": len(test_texts),
                "metrics": {},
                "overall_score": 0.0,
                "evaluated_at": datetime.now().isoformat()
            }
            
            if evaluation_type == "quality_check":
                score = self._quality_evaluation(model_info, test_texts)
                evaluation_results["overall_score"] = score
                evaluation_results["metrics"]["quality_score"] = score
                
            elif evaluation_type == "performance_test":
                perf_metrics = self._performance_evaluation(model_info, test_texts)
                evaluation_results["metrics"] = perf_metrics
                evaluation_results["overall_score"] = perf_metrics.get("avg_synthesis_speed", 0.5)
                
            elif evaluation_type == "comparison":
                comp_results = self._comparison_evaluation(model_info, test_texts)
                evaluation_results["metrics"] = comp_results
                evaluation_results["overall_score"] = comp_results.get("improvement_score", 0.5)
            
            # Store evaluation in database
            self._store_evaluation(evaluation_results)
            
            logger.info(f"✅ Model evaluation completed: {evaluation_results['overall_score']:.2f}")
            return {"success": True, "evaluation": evaluation_results}
            
        except Exception as e:
            logger.error(f"Model evaluation failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _quality_evaluation(self, model_info: Dict, test_texts: List[str]) -> float:
        """Evaluate model quality (placeholder - would use actual TTS evaluation)."""
        # This would integrate with the actual voice cloner to synthesize and evaluate
        # For now, return a mock score based on model metadata
        
        training_samples = model_info.get("training_samples", 0)
        file_size_mb = model_info.get("file_size_mb", 0)
        
        # Simple heuristic scoring
        sample_score = min(training_samples / 50.0, 1.0) if training_samples else 0.3
        size_score = min(file_size_mb / 100.0, 1.0) if file_size_mb else 0.3
        
        quality_score = (sample_score + size_score) / 2.0
        return min(quality_score + 0.3, 1.0)  # Add base quality
    
    def _performance_evaluation(self, model_info: Dict, test_texts: List[str]) -> Dict[str, float]:
        """Evaluate model performance metrics."""
        # Mock performance metrics
        return {
            "avg_synthesis_time_ms": 1500.0,
            "avg_synthesis_speed": 0.8,  # relative to real-time
            "memory_usage_mb": 2500.0,
            "gpu_utilization_percent": 45.0
        }
    
    def _comparison_evaluation(self, model_info: Dict, test_texts: List[str]) -> Dict[str, float]:
        """Compare model against base model."""
        # Mock comparison metrics
        return {
            "voice_similarity_score": 0.85,
            "naturalness_improvement": 0.25,
            "emotional_expression": 0.70,
            "improvement_score": 0.75
        }
    
    def _store_evaluation(self, evaluation: Dict[str, Any]):
        """Store evaluation results in database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO evaluations (
                model_id, evaluation_type, score, metrics, evaluated_at, evaluator
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            evaluation["model_id"],
            evaluation["evaluation_type"],
            evaluation["overall_score"],
            json.dumps(evaluation["metrics"]),
            evaluation["evaluated_at"],
            "automated_system"
        ))
        
        conn.commit()
        conn.close()
    
    def get_model_info(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a model."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM models WHERE model_id = ?
        """, (model_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        columns = [desc[0] for desc in cursor.description]
        model_info = dict(zip(columns, row))
        
        # Add evaluation history
        model_info["evaluations"] = self.get_model_evaluations(model_id)
        
        return model_info
    
    def get_model_evaluations(self, model_id: str) -> List[Dict[str, Any]]:
        """Get evaluation history for a model."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM evaluations WHERE model_id = ? ORDER BY evaluated_at DESC
        """, (model_id,))
        
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        
        evaluations = []
        for row in rows:
            eval_dict = dict(zip(columns, row))
            # Parse JSON metrics
            if eval_dict["metrics"]:
                eval_dict["metrics"] = json.loads(eval_dict["metrics"])
            evaluations.append(eval_dict)
        
        conn.close()
        return evaluations
    
    def list_models(self, user_id: str = None, status: str = "active") -> List[Dict[str, Any]]:
        """List models with optional filtering."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = "SELECT * FROM models WHERE status = ?"
        params = [status]
        
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        
        query += " ORDER BY created_at DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        
        models = []
        for row in rows:
            model_dict = dict(zip(columns, row))
            models.append(model_dict)
        
        conn.close()
        return models
    
    def archive_model(self, model_id: str, reason: str = "manual_archive") -> bool:
        """Archive a model (mark as inactive)."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE models SET status = ?, notes = ? WHERE model_id = ?
            """, ("archived", f"Archived: {reason} at {datetime.now().isoformat()}", model_id))
            
            conn.commit()
            conn.close()
            
            logger.info(f"📦 Model archived: {model_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to archive model {model_id}: {e}")
            return False
    
    def delete_model(self, model_id: str, force: bool = False) -> bool:
        """Delete a model (with safety checks)."""
        try:
            # Get model info
            model_info = self.get_model_info(model_id)
            if not model_info:
                logger.error(f"Model not found: {model_id}")
                return False
            
            # Safety check - don't delete if used recently
            if not force:
                recent_usage = self._check_recent_usage(model_id, days=7)
                if recent_usage:
                    logger.warning(f"Model {model_id} used recently, use force=True to delete")
                    return False
            
            # Delete files
            model_path = Path(model_info["file_path"])
            if model_path.exists():
                shutil.rmtree(model_path)
            
            # Delete from database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM usage_logs WHERE model_id = ?", (model_id,))
            cursor.execute("DELETE FROM evaluations WHERE model_id = ?", (model_id,))
            cursor.execute("DELETE FROM models WHERE model_id = ?", (model_id,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"🗑️ Model deleted: {model_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete model {model_id}: {e}")
            return False
    
    def _check_recent_usage(self, model_id: str, days: int = 7) -> bool:
        """Check if model was used recently."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        cursor.execute("""
            SELECT COUNT(*) FROM usage_logs 
            WHERE model_id = ? AND used_at > ?
        """, (model_id, cutoff_date))
        
        count = cursor.fetchone()[0]
        conn.close()
        
        return count > 0
    
    def log_usage(
        self, 
        model_id: str, 
        synthesis_time_ms: float,
        text_length: int,
        audio_length_seconds: float,
        success: bool,
        error_message: str = None
    ):
        """Log model usage for analytics."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO usage_logs (
                    model_id, used_at, synthesis_time_ms, text_length,
                    audio_length_seconds, success, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                model_id, datetime.now().isoformat(), synthesis_time_ms,
                text_length, audio_length_seconds, success, error_message
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to log usage for {model_id}: {e}")
    
    def get_usage_stats(self, model_id: str = None, days: int = 30) -> Dict[str, Any]:
        """Get usage statistics for models."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        if model_id:
            query = """
                SELECT 
                    COUNT(*) as usage_count,
                    AVG(synthesis_time_ms) as avg_synthesis_time,
                    AVG(text_length) as avg_text_length,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count
                FROM usage_logs 
                WHERE model_id = ? AND used_at > ?
            """
            cursor.execute(query, (model_id, cutoff_date))
        else:
            query = """
                SELECT 
                    model_id,
                    COUNT(*) as usage_count,
                    AVG(synthesis_time_ms) as avg_synthesis_time,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count
                FROM usage_logs 
                WHERE used_at > ?
                GROUP BY model_id
                ORDER BY usage_count DESC
            """
            cursor.execute(query, (cutoff_date,))
        
        if model_id:
            row = cursor.fetchone()
            if row:
                stats = {
                    "model_id": model_id,
                    "usage_count": row[0],
                    "avg_synthesis_time_ms": row[1] or 0,
                    "avg_text_length": row[2] or 0,
                    "success_rate": (row[3] / row[0]) if row[0] > 0 else 0,
                    "period_days": days
                }
            else:
                stats = {"model_id": model_id, "usage_count": 0, "period_days": days}
        else:
            rows = cursor.fetchall()
            stats = {
                "period_days": days,
                "total_models": len(rows),
                "models": []
            }
            for row in rows:
                model_stats = {
                    "model_id": row[0],
                    "usage_count": row[1],
                    "avg_synthesis_time_ms": row[2] or 0,
                    "success_rate": (row[3] / row[1]) if row[1] > 0 else 0
                }
                stats["models"].append(model_stats)
        
        conn.close()
        return stats
    
    def cleanup_old_models(self, keep_days: int = 90, keep_count: int = 5) -> Dict[str, Any]:
        """Clean up old unused models."""
        try:
            logger.info(f"🧹 Cleaning up models older than {keep_days} days...")
            
            cutoff_date = (datetime.now() - timedelta(days=keep_days)).isoformat()
            
            # Find old models that haven't been used recently
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get models to potentially delete
            cursor.execute("""
                SELECT m.model_id, m.user_id, m.created_at, m.file_path,
                       COUNT(u.id) as usage_count
                FROM models m
                LEFT JOIN usage_logs u ON m.model_id = u.model_id 
                    AND u.used_at > ?
                WHERE m.created_at < ? AND m.status = 'active'
                GROUP BY m.model_id
                HAVING usage_count = 0
            """, (cutoff_date, cutoff_date))
            
            candidates = cursor.fetchall()
            
            deleted_count = 0
            archived_count = 0
            
            for row in candidates:
                model_id, user_id, created_at, file_path, usage_count = row
                
                # Check if this user has enough recent models
                cursor.execute("""
                    SELECT COUNT(*) FROM models 
                    WHERE user_id = ? AND status = 'active' AND created_at > ?
                """, (user_id, cutoff_date))
                
                recent_count = cursor.fetchone()[0]
                
                if recent_count >= keep_count:
                    # Archive instead of delete
                    self.archive_model(model_id, f"automated_cleanup_old_{keep_days}d")
                    archived_count += 1
                else:
                    logger.info(f"Keeping old model {model_id} - user has only {recent_count} recent models")
            
            conn.close()
            
            cleanup_result = {
                "success": True,
                "candidates_found": len(candidates),
                "archived_count": archived_count,
                "deleted_count": deleted_count,
                "keep_days": keep_days,
                "keep_count": keep_count
            }
            
            logger.info(f"✅ Cleanup completed: {archived_count} archived, {deleted_count} deleted")
            return cleanup_result
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            return {"success": False, "error": str(e)}

def main():
    """Command line interface for model management."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Voice Model Manager")
    parser.add_argument("command", choices=["list", "info", "evaluate", "archive", "delete", "cleanup", "stats"])
    parser.add_argument("--model-id", help="Model ID for operations")
    parser.add_argument("--user-id", help="Filter by user ID")
    parser.add_argument("--evaluation-type", choices=["quality_check", "performance_test", "comparison"],
                       default="quality_check", help="Type of evaluation")
    parser.add_argument("--force", action="store_true", help="Force operation")
    parser.add_argument("--days", type=int, default=30, help="Number of days for stats/cleanup")
    
    args = parser.parse_args()
    
    manager = VoiceModelManager()
    
    if args.command == "list":
        models = manager.list_models(args.user_id)
        print(f"Found {len(models)} models:")
        for model in models:
            print(f"  {model['model_id']}: {model['model_version']} ({model['status']})")
    
    elif args.command == "info":
        if not args.model_id:
            print("--model-id required for info command")
            return
        
        info = manager.get_model_info(args.model_id)
        if info:
            print(f"Model: {info['model_id']}")
            print(f"Version: {info['model_version']}")
            print(f"Type: {info['model_type']}")
            print(f"Size: {info['file_size_mb']:.1f} MB")
            print(f"Created: {info['created_at']}")
            print(f"Status: {info['status']}")
            if info['evaluations']:
                print(f"Evaluations: {len(info['evaluations'])}")
        else:
            print(f"Model not found: {args.model_id}")
    
    elif args.command == "evaluate":
        if not args.model_id:
            print("--model-id required for evaluate command")
            return
        
        result = manager.evaluate_model(args.model_id, args.evaluation_type)
        if result["success"]:
            eval_data = result["evaluation"]
            print(f"Evaluation completed: {eval_data['overall_score']:.2f}")
            print(f"Type: {eval_data['evaluation_type']}")
            print(f"Metrics: {eval_data['metrics']}")
        else:
            print(f"Evaluation failed: {result['error']}")
    
    elif args.command == "archive":
        if not args.model_id:
            print("--model-id required for archive command")
            return
        
        success = manager.archive_model(args.model_id)
        if success:
            print(f"Model archived: {args.model_id}")
        else:
            print(f"Failed to archive model: {args.model_id}")
    
    elif args.command == "delete":
        if not args.model_id:
            print("--model-id required for delete command")
            return
        
        success = manager.delete_model(args.model_id, args.force)
        if success:
            print(f"Model deleted: {args.model_id}")
        else:
            print(f"Failed to delete model: {args.model_id}")
    
    elif args.command == "cleanup":
        result = manager.cleanup_old_models(args.days)
        if result["success"]:
            print(f"Cleanup completed: {result['archived_count']} archived")
        else:
            print(f"Cleanup failed: {result['error']}")
    
    elif args.command == "stats":
        stats = manager.get_usage_stats(args.model_id, args.days)
        if args.model_id:
            print(f"Usage stats for {args.model_id} (last {args.days} days):")
            print(f"  Usage count: {stats['usage_count']}")
            print(f"  Success rate: {stats.get('success_rate', 0):.1%}")
            print(f"  Avg synthesis time: {stats.get('avg_synthesis_time_ms', 0):.0f}ms")
        else:
            print(f"Usage stats for all models (last {args.days} days):")
            print(f"  Total models: {stats['total_models']}")
            for model_stats in stats['models'][:10]:  # Top 10
                print(f"  {model_stats['model_id']}: {model_stats['usage_count']} uses")

if __name__ == "__main__":
    main()