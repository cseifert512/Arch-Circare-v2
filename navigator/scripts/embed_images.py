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


def main(data_dir: str, model_name: str):
    data_dir = os.path.abspath(data_dir)
    img_root = os.path.join(data_dir, "images")
    emb_dir = os.path.join(data_dir, "embeddings", "image")
    os.makedirs(emb_dir, exist_ok=True)
    os.makedirs(os.path.join(data_dir, "embeddings"), exist_ok=True)

    # Collect all image paths deterministically
    projects = sorted([p for p in glob.glob(os.path.join(img_root, "*")) if os.path.isdir(p)])
    image_paths = []
    for pdir in projects:
        image_paths += glob.glob(os.path.join(pdir, "*.jpg"))
        image_paths += glob.glob(os.path.join(pdir, "*.jpeg"))
        image_paths += glob.glob(os.path.join(pdir, "*.png"))
    # Sort images to achieve reproducible ordering across platforms
    image_paths = sorted(image_paths)

    print(f"[embed] Using data_dir: {data_dir}")
    print(f"[embed] Found {len(image_paths)} images in {len(projects)} project folders.", flush=True)
    # Track metadata by image_id while embedding
    image_meta = {}

    if len(image_paths) == 0:
        # Still write empty id_map so downstream steps don't crash
        idmap_path = os.path.join(data_dir, "embeddings", "id_map.json")
        with open(idmap_path, "w") as f:
            json.dump(id_map, f)
        print("[embed] No images found. Wrote empty id_map.json. "
              "Expected layout: data/images/<project_id>/*.jpg|*.jpeg|*.png", flush=True)
        return

    model, tfm = load_model(model_name)

    for img_path in tqdm(image_paths, desc="[embed] Embedding", unit="img"):
        project_id = pathlib.Path(img_path).parent.name
        base = pathlib.Path(img_path).stem
        image_id = f"i_{project_id}_{base}"
        try:
            pil = Image.open(img_path).convert("RGB")
        except Exception as e:
            print(f"[embed] Skipping unreadable file: {img_path} ({e})", flush=True)
            continue

        with torch.no_grad():
            x = tfm(pil).unsqueeze(0)
            feat = model(x)
            vec = feat.cpu().numpy().astype("float32")
            vec = l2n(vec)[0]

        np.save(os.path.join(emb_dir, f"{image_id}.npy"), vec)
        image_meta[image_id] = {
            "project_id": project_id,
            "thumb": f"/images/{project_id}/{os.path.basename(img_path)}"
        }

    # Build id_map in the SAME ORDER that build_faiss.py will load vectors
    # i.e., sorted by embedding file path under emb_dir
    vec_paths = sorted(glob.glob(os.path.join(emb_dir, "*.npy")))
    id_map = {}
    for idx, vec_path in enumerate(vec_paths):
        image_id = pathlib.Path(vec_path).stem
        meta = image_meta.get(image_id)
        if meta is None:
            # Skip stray embeddings without known metadata
            continue
        id_map[str(idx)] = {
            "image_id": image_id,
            "project_id": meta["project_id"],
            "thumb": meta["thumb"],
        }

    idmap_path = os.path.join(data_dir, "embeddings", "id_map.json")
    with open(idmap_path, "w") as f:
        json.dump(id_map, f)
    print(f"[embed] Saved {len(id_map)} embeddings; wrote {idmap_path}", flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data_dir", default="data", help="Path to data folder containing /images and /embeddings")
    ap.add_argument("--model", default="vit_base_patch14_dinov2",
                    help="Model name: vit_base_patch14_dinov2 or vit_small_patch14_dinov2 for faster/lighter runs")
    args = ap.parse_args()
    main(args.data_dir, args.model)
