import numpy as np
from pathlib import Path
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class PatchFeatures:
    """Extract and encode patches for reranking."""
    
    def __init__(self, patch_embeddings_dir: Path):
        self.patch_embeddings_dir = patch_embeddings_dir
        self.patch_embeddings = {}
        self.patch_idmap = {}
        self._load_patch_embeddings()
    
    def _load_patch_embeddings(self):
        """Load patch embeddings from disk."""
        if not self.patch_embeddings_dir.exists():
            logger.warning(f"Patch embeddings directory not found: {self.patch_embeddings_dir}")
            return
        
        # Load patch ID map
        idmap_path = self.patch_embeddings_dir / "idmap_patches.json"
        if idmap_path.exists():
            import json
            with open(idmap_path, 'r') as f:
                self.patch_idmap = json.load(f)
            logger.info(f"Loaded patch ID map with {len(self.patch_idmap)} entries")
        
        # Load patch embeddings
        patch_files = list(self.patch_embeddings_dir.glob("*.npy"))
        for patch_file in patch_files:
            patch_id = patch_file.stem
            try:
                embedding = np.load(patch_file)
                self.patch_embeddings[patch_id] = embedding
            except Exception as e:
                logger.warning(f"Failed to load patch {patch_id}: {e}")
        
        logger.info(f"Loaded {len(self.patch_embeddings)} patch embeddings")
    
    def _compute_patch_distance(self, query_patches: List[np.ndarray], candidate_patches: List[np.ndarray]) -> float:
        """Compute minimum patch distance between query and candidate."""
        if not query_patches or not candidate_patches:
            return 1.0
        
        min_distance = float('inf')
        
        for query_patch in query_patches:
            for candidate_patch in candidate_patches:
                # L2 distance between patches
                distance = np.linalg.norm(query_patch - candidate_patch)
                min_distance = min(min_distance, distance)
        
        return min_distance if min_distance != float('inf') else 1.0
    
    def rerank(self, query_vector: np.ndarray, candidate_ids: List[str], candidate_scores: List[float]) -> Tuple[List[str], List[float]]:
        """
        Rerank candidates using patch-level similarity.
        
        Args:
            query_vector: Query image embedding
            candidate_ids: List of candidate image IDs
            candidate_scores: List of candidate scores
            
        Returns:
            Tuple of (reranked_ids, reranked_scores)
        """
        if not self.patch_embeddings:
            # No patch embeddings available, return original order
            return candidate_ids, candidate_scores
        
        # Extract query patches (simplified - in practice would need to extract from query image)
        # For now, use the query vector as a single "patch"
        query_patches = [query_vector]
        
        # Compute patch distances for each candidate
        patch_distances = []
        for candidate_id in candidate_ids:
            # Find patches for this candidate
            candidate_patches = []
            for patch_id, patch_embedding in self.patch_embeddings.items():
                if patch_id.startswith(candidate_id):
                    candidate_patches.append(patch_embedding)
            
            # Compute patch distance
            patch_distance = self._compute_patch_distance(query_patches, candidate_patches)
            patch_distances.append(patch_distance)
        
        # Combine original scores with patch scores (70/30 blend)
        blended_scores = []
        for i, (original_score, patch_distance) in enumerate(zip(candidate_scores, patch_distances)):
            # Normalize patch distance to [0, 1] range
            normalized_patch_score = 1.0 - min(patch_distance, 1.0)
            
            # Blend scores: 70% original, 30% patch
            blended_score = 0.7 * original_score + 0.3 * normalized_patch_score
            blended_scores.append(blended_score)
        
        # Sort by blended scores
        sorted_indices = np.argsort(blended_scores)[::-1]  # Descending order
        
        reranked_ids = [candidate_ids[i] for i in sorted_indices]
        reranked_scores = [blended_scores[i] for i in sorted_indices]
        
        return reranked_ids, reranked_scores
    
    def get_best_patch_match(self, query_vector: np.ndarray, image_id: str) -> Optional[dict]:
        """
        Get the best patch match for explanation.
        
        Args:
            query_vector: Query image embedding
            image_id: Target image ID
            
        Returns:
            Dictionary with patch_idx and score, or None
        """
        if not self.patch_embeddings:
            return None
        
        # Find patches for this image
        image_patches = []
        patch_indices = []
        
        for patch_id, patch_embedding in self.patch_embeddings.items():
            if patch_id.startswith(image_id):
                image_patches.append(patch_embedding)
                # Extract patch index from patch_id
                try:
                    patch_idx = int(patch_id.split('_patch_')[-1])
                    patch_indices.append(patch_idx)
                except:
                    patch_indices.append(0)
        
        if not image_patches:
            return None
        
        # Find best matching patch
        best_distance = float('inf')
        best_patch_idx = 0
        
        for patch_embedding, patch_idx in zip(image_patches, patch_indices):
            distance = np.linalg.norm(query_vector - patch_embedding)
            if distance < best_distance:
                best_distance = distance
                best_patch_idx = patch_idx
        
        # Convert distance to score (1 - distance, normalized)
        score = max(0.0, 1.0 - best_distance)
        
        return {
            "image_id": image_id,
            "patch_idx": best_patch_idx,
            "score": score
        }
