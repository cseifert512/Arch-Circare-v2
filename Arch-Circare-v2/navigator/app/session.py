import json
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, List
from dataclasses import dataclass, asdict
import logging

from .models import Weights

@dataclass
class SessionData:
    weights: Weights
    last_query_id: Optional[str] = None
    updated_at: Optional[str] = None

class SessionStore:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.sessions_dir = os.path.join(data_dir, "sessions")
        self.logs_dir = os.path.join(data_dir, "logs")
        
        # Ensure directories exist
        os.makedirs(self.sessions_dir, exist_ok=True)
        os.makedirs(self.logs_dir, exist_ok=True)
        
        # In-memory session store
        self._sessions: Dict[str, SessionData] = {}
        
        # Load existing sessions from disk
        self._load_sessions()
    
    def _load_sessions(self):
        """Load existing sessions from disk (best-effort)"""
        try:
            for filename in os.listdir(self.sessions_dir):
                if filename.endswith('.json'):
                    session_id = filename[:-5]  # Remove .json extension
                    filepath = os.path.join(self.sessions_dir, filename)
                    try:
                        with open(filepath, 'r') as f:
                            data = json.load(f)
                            weights = Weights(**data.get('weights', {}))
                            session_data = SessionData(
                                weights=weights,
                                last_query_id=data.get('last_query_id'),
                                updated_at=data.get('updated_at')
                            )
                            self._sessions[session_id] = session_data
                    except Exception as e:
                        logging.warning(f"Failed to load session {session_id}: {e}")
        except Exception as e:
            logging.warning(f"Failed to load sessions: {e}")
    
    def _save_session(self, session_id: str, session_data: SessionData):
        """Save session to disk (best-effort)"""
        try:
            filepath = os.path.join(self.sessions_dir, f"{session_id}.json")
            data = {
                "weights": session_data.weights.model_dump(),
                "last_query_id": session_data.last_query_id,
                "updated_at": session_data.updated_at
            }
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logging.warning(f"Failed to save session {session_id}: {e}")
    
    def get_session(self, session_id: str) -> SessionData:
        """Get session data, creating default if not exists"""
        if session_id not in self._sessions:
            # Create default session
            default_weights = Weights(visual=1.0, spatial=0.0, attr=0.25)
            session_data = SessionData(
                weights=default_weights,
                updated_at=datetime.now(timezone.utc).isoformat()
            )
            self._sessions[session_id] = session_data
            self._save_session(session_id, session_data)
        
        return self._sessions[session_id]
    
    def update_session(self, session_id: str, query_id: str, weights: Weights):
        """Update session with new query and weights"""
        session_data = self.get_session(session_id)
        session_data.last_query_id = query_id
        session_data.weights = weights
        session_data.updated_at = datetime.now(timezone.utc).isoformat()
        
        self._save_session(session_id, session_data)
    
    def log_feedback(self, session_id: str, query_id: str, liked: List[str], 
                    disliked: List[str], weights_before: Weights, weights_after: Weights):
        """Log feedback event to JSONL file"""
        try:
            log_file = os.path.join(self.logs_dir, "feedback.jsonl")
            log_entry = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "session_id": session_id,
                "query_id": query_id,
                "liked": liked,
                "disliked": disliked,
                "weights_before": weights_before.model_dump(),
                "weights_after": weights_after.model_dump()
            }
            
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception as e:
            logging.error(f"Failed to log feedback: {e}")

def clamp_weights(weights: Weights, lo: float = 0.10, hi: float = 0.70) -> Weights:
    """Clamp weights to [lo, hi] range"""
    return Weights(
        visual=max(lo, min(hi, weights.visual)),
        spatial=max(lo, min(hi, weights.spatial)),
        attr=max(lo, min(hi, weights.attr))
    )

def normalize_weights(weights: Weights) -> Weights:
    """Normalize weights to sum to 1.0"""
    total = weights.visual + weights.spatial + weights.attr
    if total <= 0:
        # Default to visual-only if all weights are zero
        return Weights(visual=1.0, spatial=0.0, attr=0.0)
    
    return Weights(
        visual=weights.visual / total,
        spatial=weights.spatial / total,
        attr=weights.attr / total
    )

def compute_weight_nudges(liked: List[str], disliked: List[str], 
                         weights_before: Weights, debug_info: Optional[Dict] = None) -> Dict[str, float]:
    """
    Compute weight nudges based on feedback.
    Returns a dict with nudges for each channel.
    """
    nudges = {"visual": 0.0, "spatial": 0.0, "attr": 0.0}
    
    # Simple heuristic nudges
    if liked:
        # If user liked results, slightly increase all channels
        nudges["visual"] += 0.05
        nudges["spatial"] += 0.05
        nudges["attr"] += 0.05
    
    if disliked:
        # If user disliked results, slightly decrease all channels
        nudges["visual"] -= 0.05
        nudges["spatial"] -= 0.05
        nudges["attr"] -= 0.05
    
    # Apply nudges based on debug info if available
    if debug_info:
        # If spatial features were used in the query, increase spatial weight
        if debug_info.get("spatial") or debug_info.get("weights_effective", {}).get("spatial", 0) > 0:
            nudges["spatial"] += 0.05
        
        # If attribute filters were applied, increase attr weight
        if debug_info.get("weights_effective", {}).get("attr", 0) > 0:
            nudges["attr"] += 0.05
    
    return nudges

def apply_weight_nudges(weights: Weights, nudges: Dict[str, float]) -> Weights:
    """Apply nudges to weights, clamp, and normalize"""
    # Apply nudges to raw values
    visual = weights.visual + nudges["visual"]
    spatial = weights.spatial + nudges["spatial"]
    attr = weights.attr + nudges["attr"]
    
    # Clamp to [0.10, 0.70]
    visual = max(0.10, min(0.70, visual))
    spatial = max(0.10, min(0.70, spatial))
    attr = max(0.10, min(0.70, attr))
    
    # Normalize to sum to 1.0
    total = visual + spatial + attr
    if total <= 0:
        # Default to visual-only if all weights are zero
        return Weights(visual=1.0, spatial=0.0, attr=0.0)
    
    normalized_visual = visual / total
    normalized_spatial = spatial / total
    normalized_attr = attr / total
    
    return Weights(
        visual=normalized_visual,
        spatial=normalized_spatial,
        attr=normalized_attr
    )

def generate_query_id() -> str:
    """Generate a unique query ID"""
    return str(uuid.uuid4())
