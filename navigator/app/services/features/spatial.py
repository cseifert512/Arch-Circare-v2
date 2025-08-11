import numpy as np
from PIL import Image
from pathlib import Path
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class SpatialFeatures:
    """Compute spatial metrics from plan images."""
    
    def __init__(self, plans_dir: Path):
        self.plans_dir = plans_dir
        self._cache = {}
    
    def _compute_room_count(self, image: np.ndarray) -> int:
        """Estimate room count from plan image using simple edge detection."""
        # Simple heuristic: count connected components after thresholding
        # This is a basic implementation - could be improved with ML
        gray = np.mean(image, axis=2) if image.ndim == 3 else image
        threshold = np.mean(gray) * 0.8
        binary = gray < threshold
        
        # Count connected components (rooms)
        from scipy import ndimage
        labeled, num_features = ndimage.label(binary)
        return min(num_features, 20)  # Cap at reasonable number
    
    def _compute_corridor_ratio(self, image: np.ndarray) -> float:
        """Compute corridor ratio (thin linear features)."""
        gray = np.mean(image, axis=2) if image.ndim == 3 else image
        
        # Detect edges
        from scipy import ndimage
        edges = ndimage.sobel(gray)
        
        # Count thin linear features
        thin_features = np.sum(edges > np.percentile(edges, 90))
        total_pixels = edges.size
        
        return min(thin_features / total_pixels, 0.3)  # Cap at reasonable ratio
    
    def _compute_elongation(self, image: np.ndarray) -> float:
        """Compute elongation (aspect ratio of bounding box)."""
        gray = np.mean(image, axis=2) if image.ndim == 3 else image
        
        # Find bounding box of non-zero pixels
        rows = np.any(gray < np.mean(gray), axis=1)
        cols = np.any(gray < np.mean(gray), axis=0)
        
        if not np.any(rows) or not np.any(cols):
            return 1.0
        
        height = np.sum(rows)
        width = np.sum(cols)
        
        if width == 0:
            return 1.0
        
        return max(height / width, width / height)
    
    def _compute_compactness(self, image: np.ndarray) -> float:
        """Compute compactness (area / perimeter^2 ratio)."""
        gray = np.mean(image, axis=2) if image.ndim == 3 else image
        
        # Simple approximation using area and edge count
        threshold = np.mean(gray) * 0.8
        binary = gray < threshold
        
        area = np.sum(binary)
        if area == 0:
            return 0.0
        
        # Approximate perimeter using edge detection
        from scipy import ndimage
        edges = ndimage.sobel(binary.astype(float))
        perimeter = np.sum(edges > 0.1)
        
        if perimeter == 0:
            return 1.0
        
        # Compactness = 4π * area / perimeter^2
        compactness = 4 * np.pi * area / (perimeter ** 2)
        return min(compactness, 1.0)  # Normalize to [0, 1]
    
    def spatial_vector(self, project_id: str) -> np.ndarray:
        """
        Compute spatial vector for a project.
        
        Returns:
            Array of [room_count, corridor_ratio, elongation, compactness]
        """
        # Check cache first
        if project_id in self._cache:
            return self._cache[project_id]
        
        # Look for plan images
        project_dir = self.plans_dir / project_id
        if not project_dir.exists():
            # No plans available, return zeros
            spatial_vec = np.array([0.0, 0.0, 1.0, 0.0])
            self._cache[project_id] = spatial_vec
            return spatial_vec
        
        # Find first plan image
        plan_files = list(project_dir.glob("*.png")) + list(project_dir.glob("*.jpg"))
        if not plan_files:
            # No plan images, return zeros
            spatial_vec = np.array([0.0, 0.0, 1.0, 0.0])
            self._cache[project_id] = spatial_vec
            return spatial_vec
        
        # Load and process first plan
        try:
            plan_image = Image.open(plan_files[0])
            image_array = np.array(plan_image)
            
            # Compute spatial metrics
            room_count = self._compute_room_count(image_array)
            corridor_ratio = self._compute_corridor_ratio(image_array)
            elongation = self._compute_elongation(image_array)
            compactness = self._compute_compactness(image_array)
            
            spatial_vec = np.array([
                float(room_count) / 20.0,  # Normalize room count
                corridor_ratio,
                min(elongation / 5.0, 1.0),  # Normalize elongation
                compactness
            ])
            
            self._cache[project_id] = spatial_vec
            return spatial_vec
            
        except Exception as e:
            logger.warning(f"Failed to compute spatial features for {project_id}: {e}")
            # Return default values on error
            spatial_vec = np.array([0.0, 0.0, 1.0, 0.0])
            self._cache[project_id] = spatial_vec
            return spatial_vec
    
    def distances(self, project_ids: list) -> list:
        """Compute spatial distances between projects."""
        # For now, return zeros (no spatial distance computation)
        # This could be enhanced to compute actual spatial similarities
        return [0.0] * len(project_ids)
