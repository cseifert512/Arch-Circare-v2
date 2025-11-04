from typing import List, Tuple, Dict, Optional
import numpy as np
import logging
from .index_store import IndexStore
from .features.spatial import SpatialFeatures
from .features.attributes import AttributeFeatures
from .features.patches import PatchFeatures
from ..models import Weights, Filters

logger = logging.getLogger(__name__)

class Pipeline:
    """Search pipeline with fusion scoring and patch reranking."""
    
    def __init__(self, index_store: IndexStore, spatial_features: SpatialFeatures, 
                 attribute_features: AttributeFeatures, patch_features: PatchFeatures):
        self.index_store = index_store
        self.spatial_features = spatial_features
        self.attribute_features = attribute_features
        self.patch_features = patch_features
    
    def normalize_weights(self, weights: Weights) -> Tuple[float, float, float]:
        """Normalize weights to sum to 1 and clamp to [0.1, 0.7]."""
        total = max(1e-9, weights.visual + weights.spatial + weights.attr)
        v, s, a = weights.visual/total, weights.spatial/total, weights.attr/total
        
        # Clamp function
        clamp = lambda x: min(max(x, 0.1), 0.7)
        return clamp(v), clamp(s), clamp(a)
    
    def _apply_filters(self, indices: List[int], distances: List[float], filters: Filters) -> Tuple[List[int], List[float]]:
        """Apply attribute filters to candidates."""
        if not filters or (not filters.typology and not filters.climate_bin and not filters.massing_type):
            return indices, distances
        
        # Convert indices to project IDs
        project_ids = []
        for idx in indices:
            project_id = self.index_store.get_project_id(idx)
            if project_id:
                project_ids.append(project_id)
        
        # Apply filters
        filter_dict = {}
        if filters.typology:
            filter_dict['typology'] = filters.typology
        if filters.climate_bin:
            filter_dict['climate_bin'] = filters.climate_bin
        if filters.massing_type:
            filter_dict['massing_type'] = filters.massing_type
        
        filtered_project_ids = self.attribute_features.apply_filters(project_ids, filter_dict)
        
        # Filter indices and distances
        filtered_indices = []
        filtered_distances = []
        
        for idx, distance in zip(indices, distances):
            project_id = self.index_store.get_project_id(idx)
            if project_id in filtered_project_ids:
                filtered_indices.append(idx)
                filtered_distances.append(distance)
        
        return filtered_indices, filtered_distances
    
    def search(self, query_vector: np.ndarray, filters: Filters, weights: Weights, k: int = 50) -> List[Tuple[str, float]]:
        """
        Perform search with fusion scoring and patch reranking.
        
        Args:
            query_vector: Query image embedding
            filters: Attribute filters
            weights: Scoring weights
            k: Number of results
            
        Returns:
            List of (image_id, score) tuples
        """
        # Step 1: Candidate retrieval (visual)
        indices, visual_distances = self.index_store.search(query_vector, k)
        
        if not indices:
            return []
        
        # Step 2: Apply filters
        indices, visual_distances = self._apply_filters(indices, visual_distances, filters)
        
        if not indices:
            return []
        
        # Step 3: Get project IDs for candidates
        project_ids = []
        for idx in indices:
            project_id = self.index_store.get_project_id(idx)
            project_ids.append(project_id or "unknown")
        
        # Step 4: Compute attribute distances
        attr_distances = self.attribute_features.distances(project_ids)
        
        # Step 5: Compute spatial distances
        spatial_distances = self.spatial_features.distances(project_ids)
        
        # Step 6: Normalize weights
        w_visual, w_spatial, w_attr = self.normalize_weights(weights)
        
        # Step 7: Fusion scoring
        fused_scores = []
        for i, (v_dist, s_dist, a_dist) in enumerate(zip(visual_distances, spatial_distances, attr_distances)):
            # Convert distances to similarities (1 - distance)
            v_sim = 1.0 - min(v_dist, 1.0)
            s_sim = 1.0 - min(s_dist, 1.0)
            a_sim = 1.0 - min(a_dist, 1.0)
            
            # Weighted fusion
            fused_score = w_visual * v_sim + w_spatial * s_sim + w_attr * a_sim
            fused_scores.append(fused_score)
        
        # Step 8: Patch rerank on top-k'
        topk_prime = min(k, 50)
        candidate_ids = [self.index_store.get_image_id(idx) for idx in indices[:topk_prime]]
        candidate_scores = fused_scores[:topk_prime]
        
        if candidate_ids and self.patch_features:
            reranked_ids, reranked_scores = self.patch_features.rerank(
                query_vector, candidate_ids, candidate_scores
            )
        else:
            reranked_ids = candidate_ids
            reranked_scores = candidate_scores
        
        # Step 9: Combine reranked top-k' with remaining candidates
        remaining_indices = indices[topk_prime:]
        remaining_scores = fused_scores[topk_prime:]
        remaining_ids = [self.index_store.get_image_id(idx) for idx in remaining_indices]
        
        final_ids = reranked_ids + remaining_ids
        final_scores = reranked_scores + remaining_scores
        
        # Return top-k results
        results = list(zip(final_ids, final_scores))
        results.sort(key=lambda x: x[1], reverse=True)  # Sort by score descending
        
        return results[:k]
    
    def get_explanation(self, query_vector: np.ndarray, image_id: str, project_id: str) -> Dict:
        """Generate explanation for why an image is similar."""
        explanation = {}
        
        # Get patch match if available
        if self.patch_features:
            patch_match = self.patch_features.get_best_patch_match(query_vector, image_id)
            if patch_match:
                explanation['patch_match'] = patch_match
        
        # Get attribute matches
        project_attrs = self.attribute_features._get_project_attributes(project_id)
        if project_attrs:
            explanation['attributes'] = project_attrs
        
        return explanation
