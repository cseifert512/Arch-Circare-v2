import faiss
import numpy as np
import json
from pathlib import Path
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class IndexStore:
    """Wrapper around FAISS index for building, loading, and searching."""
    
    def __init__(self, index_path: Path, idmap_path: Path):
        self.index_path = index_path
        self.idmap_path = idmap_path
        self.index = None
        self.idmap = None
        self._load_index()
    
    def _load_index(self):
        """Load FAISS index and idmap from disk."""
        if not self.index_path.exists():
            raise RuntimeError(f"FAISS index not found: {self.index_path}")
        if not self.idmap_path.exists():
            raise RuntimeError(f"ID map not found: {self.idmap_path}")
        
        logger.info(f"Loading FAISS index from {self.index_path}")
        self.index = faiss.read_index(str(self.index_path))
        
        logger.info(f"Loading ID map from {self.idmap_path}")
        with open(self.idmap_path, 'r') as f:
            self.idmap = json.load(f)
        
        logger.info(f"Loaded index with {self.index.ntotal} vectors and {len(self.idmap)} ID mappings")
    
    def search(self, query_vector: np.ndarray, k: int) -> Tuple[List[int], List[float]]:
        """
        Search for similar vectors.
        
        Args:
            query_vector: Query vector (normalized)
            k: Number of results to return
            
        Returns:
            Tuple of (indices, distances)
        """
        if self.index is None:
            raise RuntimeError("Index not loaded")
        
        # Ensure query is the right shape and type
        if query_vector.ndim == 1:
            query_vector = query_vector.reshape(1, -1)
        
        query_vector = query_vector.astype(np.float32)
        
        # Perform search
        distances, indices = self.index.search(query_vector, k)
        
        # Convert to lists and handle empty results
        if indices.size == 0:
            return [], []
        
        return indices[0].tolist(), distances[0].tolist()
    
    def get_image_id(self, index: int) -> Optional[str]:
        """Get image ID for a given index."""
        if self.idmap is None:
            return None
        return self.idmap.get(str(index))
    
    def get_project_id(self, index: int) -> Optional[str]:
        """Get project ID for a given index (extract from image ID)."""
        image_id = self.get_image_id(index)
        if image_id:
            # Extract project_id from image_id (format: project_id_filename)
            parts = image_id.split('_', 1)
            if len(parts) >= 2:
                return parts[0]
        return None
    
    def get_total_vectors(self) -> int:
        """Get total number of vectors in the index."""
        if self.index is None:
            return 0
        return self.index.ntotal
    
    def get_dimension(self) -> int:
        """Get vector dimension."""
        if self.index is None:
            return 0
        return self.index.d

# Global index store instance
_index_store = None

def get_index_store(index_path: Optional[Path] = None, idmap_path: Optional[Path] = None) -> IndexStore:
    """Get or create global index store instance."""
    global _index_store
    if _index_store is None or (index_path and _index_store.index_path != index_path):
        if index_path is None or idmap_path is None:
            raise ValueError("Both index_path and idmap_path must be provided for first initialization")
        _index_store = IndexStore(index_path, idmap_path)
    return _index_store
