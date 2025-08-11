import os
import json
import argparse
import glob
import time
import pathlib
import numpy as np
from PIL import Image
import torch
import timm
from tqdm import tqdm
from typing import List, Tuple, Optional


def l2n(x):
    """L2-normalize vectors along axis=1."""
    n = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
    return x / n


def load_model(name: str):
    """Load a DINOv2 model + its preprocessing transform."""
    print(f"[embed] Loading model: {name} (downloading if needed)...", flush=True)
    t0 = time.time()
    model = timm.create_model(name, pretrained=True)
    model.eval()
    model.reset_classifier(0)
    cfg = timm.data.resolve_data_config({}, model=model)
    tfm = timm.data.create_transform(**cfg, is_training=False)
    print(f"[embed] Model ready in {time.time()-t0:.1f}s", flush=True)
    return model, tfm


def extract_patches(image: Image.Image, grid_size: int = 4) -> List[Image.Image]:
    """Extract patches from image in a grid."""
    width, height = image.size
    patch_width = width // grid_size
    patch_height = height // grid_size
    
    patches = []
    for i in range(grid_size):
        for j in range(grid_size):
            left = j * patch_width
            top = i * patch_height
            right = left + patch_width
            bottom = top + patch_height
            patch = image.crop((left, top, right, bottom))
            patches.append(patch)
    
    return patches


def embed_image(model, tfm, image_path: str) -> Tuple[np.ndarray, List[np.ndarray]]:
    """Embed a single image and its patches."""
    try:
        pil = Image.open(image_path).convert("RGB")
    except Exception as e:
        print(f"[embed] Skipping unreadable file: {image_path} ({e})", flush=True)
        return None, []
    
    # Global image embedding
    with torch.no_grad():
        x = tfm(pil).unsqueeze(0)
        feat = model(x)
        vec = feat.cpu().numpy().astype("float32")
        vec = l2n(vec)[0]
    
    # Patch embeddings
    patches = extract_patches(pil, grid_size=4)  # Fixed 4x4 grid
    patch_embeddings = []
    
    for patch in patches:
        with torch.no_grad():
            x_patch = tfm(patch).unsqueeze(0)
            feat_patch = model(x_patch)
            vec_patch = feat_patch.cpu().numpy().astype("float32")
            vec_patch = l2n(vec_patch)[0]
            patch_embeddings.append(vec_patch)
    
    return vec, patch_embeddings


def process_directory(model, tfm, data_dir: str, output_dir: str, patch_output_dir: Optional[str] = None, grid_size: int = 4):
    """Process all images in a directory."""
    if not os.path.exists(data_dir):
        print(f"[embed] Directory not found: {data_dir}")
        return {}
    
    image_paths = []
    for ext in ['*.jpg', '*.jpeg', '*.png']:
        image_paths.extend(glob.glob(os.path.join(data_dir, "**", ext), recursive=True))
    
    if not image_paths:
        print(f"[embed] No images found in {data_dir}")
        return {}
    
    print(f"[embed] Found {len(image_paths)} images in {data_dir}")
    
    id_map = {}
    patch_id_map = {}
    patch_idx = 0
    
    for idx, img_path in enumerate(tqdm(image_paths, desc=f"[embed] Processing {os.path.basename(data_dir)}", unit="img")):
        project_id = pathlib.Path(img_path).parent.name
        base = pathlib.Path(img_path).stem
        image_id = f"{project_id}_{base}"
        
        vec, patch_embeddings = embed_image(model, tfm, img_path)
        if vec is None:
            continue
        
        # Save global embedding
        np.save(os.path.join(output_dir, f"{image_id}.npy"), vec)
        id_map[str(idx)] = image_id
        
        # Save patch embeddings if requested
        if patch_output_dir and patch_embeddings:
            for patch_idx_local, patch_vec in enumerate(patch_embeddings):
                patch_filename = f"{image_id}_patch_{patch_idx_local}.npy"
                np.save(os.path.join(patch_output_dir, patch_filename), patch_vec)
                patch_id_map[str(patch_idx)] = {
                    "image_id": image_id,
                    "patch_idx": patch_idx_local
                }
                patch_idx += 1
    
    return id_map, patch_id_map


def main(images_dir: str, plans_dir: Optional[str], out_dir: str, out_patches_dir: Optional[str], grid_size: int = 4, model_name: str = "vit_base_patch14_dinov2"):
    """Main embedding function."""
    print(f"[embed] Starting batch embedding...")
    print(f"[embed] Images: {images_dir}")
    print(f"[embed] Plans: {plans_dir}")
    print(f"[embed] Output: {out_dir}")
    print(f"[embed] Patch output: {out_patches_dir}")
    print(f"[embed] Grid size: {grid_size}")
    
    # Create output directories
    os.makedirs(out_dir, exist_ok=True)
    if out_patches_dir:
        os.makedirs(out_patches_dir, exist_ok=True)
    
    # Load model
    model, tfm = load_model(model_name)
    
    # Process images
    image_id_map, image_patch_id_map = process_directory(
        model, tfm, images_dir, out_dir, out_patches_dir, grid_size
    )
    
    # Process plans if provided
    plan_id_map, plan_patch_id_map = {}, {}
    if plans_dir and os.path.exists(plans_dir):
        plan_id_map, plan_patch_id_map = process_directory(
            model, tfm, plans_dir, out_dir, out_patches_dir, grid_size
        )
    
    # Combine ID maps
    combined_id_map = {**image_id_map, **plan_id_map}
    combined_patch_id_map = {**image_patch_id_map, **plan_patch_id_map}
    
    # Save ID maps
    idmap_path = os.path.join(os.path.dirname(out_dir), "idmap.json")
    with open(idmap_path, "w") as f:
        json.dump(combined_id_map, f, indent=2)
    
    if out_patches_dir and combined_patch_id_map:
        patch_idmap_path = os.path.join(out_patches_dir, "idmap_patches.json")
        with open(patch_idmap_path, "w") as f:
            json.dump(combined_patch_id_map, f, indent=2)
    
    print(f"[embed] Completed!")
    print(f"[embed] Saved {len(combined_id_map)} embeddings to {out_dir}")
    print(f"[embed] Saved ID map to {idmap_path}")
    if out_patches_dir and combined_patch_id_map:
        print(f"[embed] Saved {len(combined_patch_id_map)} patch embeddings to {out_patches_dir}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Batch embed images and plans")
    ap.add_argument("--images", required=True, help="Path to images directory")
    ap.add_argument("--plans", help="Path to plans directory (optional)")
    ap.add_argument("--out", required=True, help="Output directory for embeddings")
    ap.add_argument("--out_patches", help="Output directory for patch embeddings (optional)")
    ap.add_argument("--grid", type=int, default=4, help="Grid size for patch extraction (default: 4)")
    ap.add_argument("--model", default="vit_base_patch14_dinov2", 
                    help="Model name (default: vit_base_patch14_dinov2)")
    
    args = ap.parse_args()
    main(args.images, args.plans, args.out, args.out_patches, args.grid, args.model)
