"""
Patch operations for Arch-Circare v2.

Handles loading patch embeddings and computing patch-based distances for reranking.
"""

import os
import sys
from pathlib import Path
from typing import Optional
import numpy as np
import torch
import timm
from PIL import Image
import logging
from functools import lru_cache

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.faiss_service import l2n

logger = logging.getLogger(__name__)

# Global model and transform for on-the-fly patch computation
_model = None
_transform = None

def get_model_and_transform():
    """Get global model and transform for patch embedding."""
    global _model, _transform
    if _model is None:
        model_name = "vit_small_patch14_dinov2"
        _model = timm.create_model(model_name, pretrained=True)
        _model.eval()
        _model.reset_classifier(0)
        
        cfg = timm.data.resolve_data_config({}, model=_model)
        _transform = timm.data.create_transform(**cfg, is_training=False)
    
    return _model, _transform

def tile_image(pil: Image.Image, grid: int = 4):
    """Tile an image into non-overlapping patches."""
    W, H = pil.size
    w, h = W // grid, H // grid
    
    for gy in range(grid):
        for gx in range(grid):
            box = (gx * w, gy * h, (gx + 1) * w, (gy + 1) * h)
            yield gx, gy, pil.crop(box)

def embed_patches_from_pil(pil: Image.Image, grid: int = 4) -> np.ndarray:
    """Embed patches from a PIL image on-the-fly."""
    model, transform = get_model_and_transform()
    embeddings = []
    
    with torch.no_grad():
        for gx, gy, patch in tile_image(pil, grid):
            # Convert to RGB and apply transform
            patch_rgb = patch.convert('RGB')
            patch_tensor = transform(patch_rgb).unsqueeze(0)
            
            # Get embedding
            embedding = model(patch_tensor)
            embeddings.append(embedding.cpu().numpy().flatten())
    
    # Stack embeddings and L2-normalize
    embeddings = np.array(embeddings, dtype=np.float32)
    embeddings = l2n(embeddings)
    
    return embeddings

@lru_cache(maxsize=1024)
def load_patches(image_id: str, P: int = 16, data_dir: str = "data") -> Optional[np.ndarray]:
    """
    Load patch embeddings for an image.
    
    Args:
        image_id: Image ID (e.g., "i_p_sanaa_rolex_hero")
        P: Number of patches (default 16 for 4x4 grid)
        data_dir: Data directory path
    
    Returns:
        Array of shape (P, d) with L2-normalized embeddings, or None if not found
    """
    patch_file = Path(data_dir) / "embeddings" / "patch" / f"{image_id}__p{P}.npy"
    
    if patch_file.exists():
        try:
            patches = np.load(patch_file)
            return patches.astype(np.float32)
        except Exception as e:
            logger.warning(f"Failed to load patches for {image_id}: {e}")
            return None
    else:
        logger.warning(f"Patch file not found: {patch_file}")
        return None

def min_patch_distance(Q: np.ndarray, C: np.ndarray) -> float:
    """
    Compute minimum patch distance between two sets of patches.
    
    Args:
        Q: Query patches, shape (Pq, d), L2-normalized
        C: Candidate patches, shape (Pc, d), L2-normalized
    
    Returns:
        Distance score (0 = identical, larger = worse)
    """
    # Compute cosine similarities
    sims = Q @ C.T  # (Pq, Pc)
    
    # Find best aligned patch pair
    best_sim = sims.max()
    
    # Convert to distance-like score
    d = 1.0 - float(best_sim)
    
    return d

def compute_query_patches(pil: Image.Image, grid: int = 4, image_id: Optional[str] = None, data_dir: str = "data") -> np.ndarray:
    """
    Compute patches for a query image.
    
    Args:
        pil: PIL Image
        grid: Grid size for tiling
        image_id: Optional image ID to try loading precomputed patches
        data_dir: Data directory path
    
    Returns:
        Array of shape (grid*grid, d) with L2-normalized embeddings
    """
    # Try to load precomputed patches if image_id is provided
    if image_id:
        patches = load_patches(image_id, grid * grid, data_dir)
        if patches is not None:
            return patches
    
    # Fall back to on-the-fly computation
    return embed_patches_from_pil(pil, grid)

def get_image_id_from_path(file_path: str) -> Optional[str]:
    """
    Try to extract image_id from file path.
    
    Args:
        file_path: Path to image file
    
    Returns:
        Image ID if extractable, None otherwise
    """
    try:
        path = Path(file_path)
        # Look for pattern like "p_projectname_imagename"
        parts = path.stem.split('_')
        if len(parts) >= 3 and parts[0] == 'p':
            project_id = f"p_{parts[1]}"
            image_type = parts[2]
            return f"i_{project_id}_{image_type}"
    except:
        pass
    return None

def rerank_by_patches(results: list, query_patches: np.ndarray, 
                     re_topk: int, top_k: int, patches: int = 16, 
                     data_dir: str = "data") -> tuple:
    """
    Rerank results by patch similarity.
    
    Args:
        results: List of search results
        query_patches: Query patches, shape (P, d)
        re_topk: Number of results to rerank
        top_k: Number of results to return
        patches: Number of patches per image
        data_dir: Data directory path
    
    Returns:
        Tuple of (reranked_results, debug_info)
    """
    # Take top re_topk results for reranking
    candidates = results[:re_topk]
    
    scored = []
    for j, result in enumerate(candidates):
        image_id = result.get("image_id")
        if not image_id:
            continue
        
        # Load candidate patches
        candidate_patches = load_patches(image_id, patches, data_dir)
        if candidate_patches is None:
            # Skip if patches not available
            continue
        
        # Compute patch distance
        d = min_patch_distance(query_patches, candidate_patches)
        scored.append((d, result))
    
    # Sort by patch distance (ascending)
    scored.sort(key=lambda x: x[0])
    
    # Take top_k results
    reranked = [result for _, result in scored[:top_k]]
    
    # Count how many items changed rank
    original_ids = [r.get("image_id") for r in results[:top_k]]
    reranked_ids = [r.get("image_id") for r in reranked]
    
    moved = 0
    for i, (orig_id, rerank_id) in enumerate(zip(original_ids, reranked_ids)):
        if orig_id != rerank_id:
            moved += 1
    
    debug_info = {
        "rerank": "patch_min",
        "re_topk": re_topk,
        "patches": patches,
        "moved": moved
    }
    
    return reranked, debug_info
