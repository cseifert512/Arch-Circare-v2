#!/usr/bin/env python3
"""
Spatial metrics extractor for architectural plans.

Extracts elongation, convexity, room count, and corridor ratio from plan images.
"""

import argparse
import os
import sys
import csv
import numpy as np
from pathlib import Path
from typing import Optional, Tuple, List
import logging

# Computer vision imports
try:
    import cv2
    from skimage import measure, morphology, filters, util
    from skimage.measure import label, regionprops
    from skimage.morphology import binary_closing, skeletonize
    from skimage.filters import threshold_otsu
    from PIL import Image
except ImportError as e:
    print(f"Missing required packages: {e}")
    print("Install with: pip install opencv-python scikit-image pillow")
    sys.exit(1)

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

logger = logging.getLogger(__name__)

def setup_logging():
    """Setup logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

def find_plan_image(project_id: str, data_dir: str) -> Optional[Path]:
    """
    Find plan image for a project.
    
    Priority order:
    1. data/plans/{project_id}/*.png|*.jpg
    2. data/images/{project_id}/plan.*
    
    Args:
        project_id: Project ID (e.g., "p_sanaa_rolex")
        data_dir: Data directory path
    
    Returns:
        Path to plan image if found, None otherwise
    """
    data_path = Path(data_dir)
    
    # Try plans directory first
    plans_dir = data_path / "plans" / project_id
    if plans_dir.exists():
        for ext in ["*.png", "*.jpg", "*.jpeg"]:
            files = list(plans_dir.glob(ext))
            if files:
                return files[0]
    
    # Try images directory
    images_dir = data_path / "images" / project_id
    if images_dir.exists():
        for ext in ["plan.*", "plan_*.*"]:
            files = list(images_dir.glob(ext))
            if files:
                return files[0]
    
    return None

def load_and_preprocess_image(image_path: Path) -> np.ndarray:
    """
    Load and preprocess plan image.
    
    Args:
        image_path: Path to plan image
    
    Returns:
        Preprocessed grayscale image
    """
    # Load image
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Normalize to [0, 1]
    gray = gray.astype(np.float32) / 255.0
    
    return gray

def extract_floorplate_mask(gray: np.ndarray) -> np.ndarray:
    """
    Extract floorplate mask from grayscale image.
    
    Args:
        gray: Grayscale image [0, 1]
    
    Returns:
        Binary floorplate mask
    """
    # Otsu thresholding
    thresh = threshold_otsu(gray)
    binary = gray > thresh
    
    # Check if we need to invert (assume walls are dark, space is light)
    if np.mean(gray) < 0.5:
        binary = ~binary
    
    # Fill holes with binary closing
    binary = binary_closing(binary)
    
    # Keep largest connected component
    labeled = label(binary)
    props = regionprops(labeled)
    
    if not props:
        raise ValueError("No connected components found")
    
    # Find largest component by area
    largest_comp = max(props, key=lambda p: p.area)
    floorplate = labeled == largest_comp.label
    
    return floorplate

def compute_spatial_metrics(floorplate: np.ndarray) -> Tuple[float, float, int, float]:
    """
    Compute spatial metrics from floorplate mask.
    
    Args:
        floorplate: Binary floorplate mask
    
    Returns:
        Tuple of (elongation, convexity, room_count, corridor_ratio)
    """
    # Get region properties
    labeled = label(floorplate)
    props = regionprops(labeled)[0]
    
    # Elongation = major_axis_length / minor_axis_length
    elongation = props.major_axis_length / props.minor_axis_length
    
    # Convexity = area(floorplate) / area(convex_hull)
    hull = morphology.convex_hull_image(floorplate)
    convexity = props.area / np.sum(hull)
    convexity = np.clip(convexity, 0.0, 1.0)
    
    # Extract space mask (floorplate minus thickened walls)
    # Simple approach: dilate edges then subtract
    edges = morphology.binary_dilation(floorplate) & ~floorplate
    thickened_edges = morphology.binary_dilation(edges, morphology.disk(3))
    space_mask = floorplate & ~thickened_edges
    
    # Room count = connected components with sufficient area
    min_area = 0.002 * props.area  # 0.2% of floorplate area
    space_labeled = label(space_mask)
    space_props = regionprops(space_labeled)
    
    room_count = sum(1 for p in space_props if p.area >= min_area)
    
    # Corridor ratio = skeleton density
    if np.sum(space_mask) > 0:
        skeleton = skeletonize(space_mask)
        corridor_ratio = np.sum(skeleton) / np.sum(space_mask)
    else:
        corridor_ratio = 0.0
    
    return elongation, convexity, room_count, corridor_ratio

def process_plan_image(image_path: Path, debug_dir: Optional[Path] = None) -> Tuple[float, float, int, float]:
    """
    Process a single plan image and extract spatial metrics.
    
    Args:
        image_path: Path to plan image
        debug_dir: Optional directory to save debug images
    
    Returns:
        Tuple of (elongation, convexity, room_count, corridor_ratio)
    """
    try:
        # Load and preprocess
        gray = load_and_preprocess_image(image_path)
        
        # Extract floorplate
        floorplate = extract_floorplate_mask(gray)
        
        # Compute metrics
        elongation, convexity, room_count, corridor_ratio = compute_spatial_metrics(floorplate)
        
        # Save debug images if requested
        if debug_dir:
            debug_dir.mkdir(parents=True, exist_ok=True)
            
            # Save grayscale
            cv2.imwrite(str(debug_dir / f"{image_path.stem}_gray.png"), 
                       (gray * 255).astype(np.uint8))
            
            # Save floorplate
            cv2.imwrite(str(debug_dir / f"{image_path.stem}_floorplate.png"), 
                       (floorplate * 255).astype(np.uint8))
            
            # Save space mask
            edges = morphology.binary_dilation(floorplate) & ~floorplate
            thickened_edges = morphology.binary_dilation(edges, morphology.disk(3))
            space_mask = floorplate & ~thickened_edges
            cv2.imwrite(str(debug_dir / f"{image_path.stem}_space.png"), 
                       (space_mask * 255).astype(np.uint8))
        
        return elongation, convexity, room_count, corridor_ratio
        
    except Exception as e:
        logger.error(f"Error processing {image_path}: {e}")
        return None

def find_projects(data_dir: str) -> List[str]:
    """
    Find all project IDs in the data directory.
    
    Args:
        data_dir: Data directory path
    
    Returns:
        List of project IDs
    """
    data_path = Path(data_dir)
    projects = set()
    
    # Check images directory
    images_dir = data_path / "images"
    if images_dir.exists():
        for project_dir in images_dir.iterdir():
            if project_dir.is_dir() and project_dir.name.startswith("p_"):
                projects.add(project_dir.name)
    
    # Check plans directory
    plans_dir = data_path / "plans"
    if plans_dir.exists():
        for project_dir in plans_dir.iterdir():
            if project_dir.is_dir() and project_dir.name.startswith("p_"):
                projects.add(project_dir.name)
    
    return sorted(list(projects))

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Extract spatial metrics from plan images")
    parser.add_argument("--data_dir", type=str, required=True, help="Data directory path")
    parser.add_argument("--min_room_area_px", type=int, default=100, help="Minimum room area in pixels")
    parser.add_argument("--debug_dir", type=str, help="Directory to save debug images")
    
    args = parser.parse_args()
    
    setup_logging()
    
    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        logger.error(f"Data directory does not exist: {data_dir}")
        sys.exit(1)
    
    # Find all projects
    projects = find_projects(str(data_dir))
    logger.info(f"Found {len(projects)} projects: {projects}")
    
    # Prepare output file
    output_file = data_dir / "metadata" / "spatial.csv"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    debug_dir = Path(args.debug_dir) if args.debug_dir else None
    
    # Process each project
    results = []
    processed_count = 0
    
    for project_id in projects:
        logger.info(f"Processing {project_id}...")
        
        # Find plan image
        plan_path = find_plan_image(project_id, str(data_dir))
        if not plan_path:
            logger.warning(f"No plan image found for {project_id}")
            continue
        
        logger.info(f"Found plan: {plan_path}")
        
        # Process plan
        metrics = process_plan_image(plan_path, debug_dir)
        if metrics is None:
            logger.warning(f"Failed to process {project_id}")
            continue
        
        elongation, convexity, room_count, corridor_ratio = metrics
        
        results.append({
            'project_id': project_id,
            'elongation': round(elongation, 3),
            'convexity': round(convexity, 3),
            'room_count': room_count,
            'corridor_ratio': round(corridor_ratio, 3)
        })
        
        processed_count += 1
        logger.info(f"  Elongation: {elongation:.3f}")
        logger.info(f"  Convexity: {convexity:.3f}")
        logger.info(f"  Room count: {room_count}")
        logger.info(f"  Corridor ratio: {corridor_ratio:.3f}")
    
    # Write results to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['project_id', 'elongation', 'convexity', 'room_count', 'corridor_ratio'])
        writer.writeheader()
        writer.writerows(results)
    
    logger.info(f"Processed {processed_count} projects")
    logger.info(f"Results saved to: {output_file}")
    
    # Print summary
    print(f"\nSummary:")
    print(f"  Total projects: {len(projects)}")
    print(f"  Successfully processed: {processed_count}")
    print(f"  Output file: {output_file}")
    
    if processed_count >= 7:
        print("  ✅ Success: At least 7 projects processed")
    else:
        print(f"  ⚠️  Warning: Only {processed_count} projects processed (need 7+)")

if __name__ == "__main__":
    main()
