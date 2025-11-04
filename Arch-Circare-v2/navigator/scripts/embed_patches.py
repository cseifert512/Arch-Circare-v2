#!/usr/bin/env python3
"""
Patch embedding script for Arch-Circare v2.

Precomputes patch embeddings for every image using grid tiling and DINOv2 model.
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Iterator, Tuple
import numpy as np
import torch
import timm
from PIL import Image
import logging

# Add the parent directory to the path so we can import from app
sys.path.append(str(Path(__file__).parent.parent))

from app.faiss_service import l2n

def setup_logging():
    """Setup logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

def get_model_and_transform(model_name: str = "vit_small_patch14_dinov2"):
    """Get the model and transform for embedding."""
    model = timm.create_model(model_name, pretrained=True)
    model.eval()
    model.reset_classifier(0)  # Remove classification head
    
    # Get transform
    cfg = timm.data.resolve_data_config({}, model=model)
    transform = timm.data.create_transform(**cfg, is_training=False)
    
    return model, transform

def tile_image(pil: Image.Image, grid: int = 4) -> Iterator[Tuple[int, int, Image.Image]]:
    """
    Tile an image into non-overlapping patches.
    
    Args:
        pil: PIL Image to tile
        grid: Grid size (grid x grid patches)
    
    Yields:
        Tuple of (grid_x, grid_y, cropped_image)
    """
    W, H = pil.size
    w, h = W // grid, H // grid
    
    for gy in range(grid):
        for gx in range(grid):
            box = (gx * w, gy * h, (gx + 1) * w, (gy + 1) * h)
            yield gx, gy, pil.crop(box)

def resize_image(pil: Image.Image, max_side: int) -> Image.Image:
    """
    Resize image so the longest side is max_side while maintaining aspect ratio.
    
    Args:
        pil: PIL Image to resize
        max_side: Maximum side length
    
    Returns:
        Resized PIL Image
    """
    W, H = pil.size
    if W <= max_side and H <= max_side:
        return pil
    
    # Calculate new dimensions
    if W > H:
        new_W = max_side
        new_H = int(H * max_side / W)
    else:
        new_H = max_side
        new_W = int(W * max_side / H)
    
    return pil.resize((new_W, new_H), Image.Resampling.LANCZOS)

def embed_patches(model: torch.nn.Module, transform, pil: Image.Image, grid: int = 4) -> np.ndarray:
    """
    Embed patches from an image.
    
    Args:
        model: DINOv2 model
        transform: Image transform
        pil: PIL Image
        grid: Grid size for tiling
    
    Returns:
        Array of shape (grid*grid, d) with L2-normalized embeddings
    """
    model.eval()
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

def find_images(data_dir: str) -> list:
    """
    Find all images in the data directory.
    
    Args:
        data_dir: Path to data directory
    
    Returns:
        List of (image_path, image_id) tuples
    """
    images_dir = Path(data_dir) / "images"
    if not images_dir.exists():
        raise FileNotFoundError(f"Images directory not found: {images_dir}")
    
    image_extensions = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
    images = []
    
    for project_dir in images_dir.iterdir():
        if not project_dir.is_dir():
            continue
        
        project_id = project_dir.name
        for image_file in project_dir.iterdir():
            if image_file.suffix in image_extensions:
                # Extract image ID from filename
                stem = image_file.stem
                image_id = f"i_{project_id}_{stem}"
                images.append((str(image_file), image_id))
    
    return images

def main():
    parser = argparse.ArgumentParser(description="Embed patches for all images")
    parser.add_argument("--data_dir", type=str, required=True, help="Path to data directory")
    parser.add_argument("--model", type=str, default="vit_small_patch14_dinov2", help="Model name")
    parser.add_argument("--grid", type=int, default=4, help="Grid size for tiling")
    parser.add_argument("--max_side", type=int, default=1024, help="Maximum side length for resizing")
    parser.add_argument("--device", type=str, default="auto", help="Device to use (auto, cpu, cuda)")
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging()
    logger = logging.getLogger(__name__)
    
    # Determine device
    if args.device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)
    
    logger.info(f"Using device: {device}")
    logger.info(f"Model: {args.model}")
    logger.info(f"Grid size: {args.grid}")
    logger.info(f"Max side: {args.max_side}")
    
    # Get model and transform
    logger.info("Loading model and transform...")
    model, transform = get_model_and_transform(args.model)
    model = model.to(device)
    
    # Find all images
    logger.info("Finding images...")
    images = find_images(args.data_dir)
    logger.info(f"Found {len(images)} images")
    
    # Create output directory
    output_dir = Path(args.data_dir) / "embeddings" / "patch"
    output_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Output directory: {output_dir}")
    
    # Process each image
    processed_count = 0
    skipped_count = 0
    
    for image_path, image_id in images:
        output_file = output_dir / f"{image_id}__p{args.grid * args.grid}.npy"
        
        # Skip if already exists
        if output_file.exists():
            logger.info(f"Skipping {image_id} (already exists)")
            skipped_count += 1
            continue
        
        try:
            logger.info(f"Processing {image_id}...")
            
            # Load and resize image
            pil = Image.open(image_path)
            pil = resize_image(pil, args.max_side)
            
            # Embed patches
            embeddings = embed_patches(model, transform, pil, args.grid)
            
            # Save embeddings
            np.save(output_file, embeddings)
            
            logger.info(f"Saved {embeddings.shape[0]} patches for {image_id}")
            processed_count += 1
            
        except Exception as e:
            logger.error(f"Error processing {image_id}: {e}")
            continue
    
    # Print summary
    total_patches = args.grid * args.grid
    logger.info("=" * 50)
    logger.info(f"Summary:")
    logger.info(f"  Processed: {processed_count} images")
    logger.info(f"  Skipped: {skipped_count} images")
    logger.info(f"  Total: {processed_count + skipped_count} images")
    logger.info(f"  Patches per image: {total_patches}")
    logger.info(f"  Output directory: {output_dir}")
    logger.info(f"  Files created: {len(list(output_dir.glob('*.npy')))}")

if __name__ == "__main__":
    main()
