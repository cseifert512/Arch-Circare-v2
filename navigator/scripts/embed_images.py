import os, json, argparse, glob, time, pathlib
import numpy as np
from PIL import Image
import torch, timm
from tqdm import tqdm

def l2n(x):
    n = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
    return x / n

def load_model(name: str):
    print(f"[embed] Loading model: {name} (downloading if needed)...", flush=True)
    t0 = time.time()
    model = timm.create_model(name, pretrained=True)
    model.eval(); model.reset_classifier(0)
    cfg = timm.data.resolve_data_config({}, model=model)
    tfm = timm.data.create_transform(**cfg, is_training=False)
    print(f"[embed] Model ready in {time.time()-t0:.1f}s", flush=True)
    return model, tfm

def main(data_dir: str, model_name: str):
    data_dir = os.path.abspath(data_dir)
    img_root = os.path.join(data_dir, "images")
    emb_dir  = os.path.join(data_dir, "embeddings", "image")
    os.makedirs(emb_dir, exist_ok=True)
    os.makedirs(os.path.join(data_dir, "embeddings"), exist_ok=True)

    projects = [p for p in glob.glob(os.path.join(img_root, "*")) if os.path.isdir(p)]
    image_paths = []
    for pdir in projects:
        image_paths += glob.glob(os.path.join(pdir, "*.jpg")) + glob.glob(os.path.join(pdir, "*.png"))

    print(f"[embed] Using data_dir: {data_dir}")
    print(f"[embed] Found {len(image_paths)} images in {len(projects)} project folders.", flush=True)
    id_map = {}

    if len(image_paths) == 0:
        # Still write an empty id_map so downstream scripts don't crash
        idmap_path = os.path.join(data_dir, "embeddings", "id_map.json")
        with open(idmap_path, "w") as f:
            json.dump(id_map, f)
        print("[embed] No images found. Wrote empty id_map.json. Check your path/layout: data/images/<project_id>/*.jpg|*.png", flush=True)
        return

    model, tfm = load_model(model_name)

    for idx, img_path in enumerate(tqdm(image_paths, desc="[embed] Embedding", unit="img")):
        project_id = pathlib.Path(img_path).parent.name
        base = pathlib.Path(img_path).stem
        image_id = f"i_{base}"
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
        id_map[str(idx)] = {
            "image_id": image_id,
            "project_id": project_id,
            "thumb": f"/images/{project_id}/{os.path.basename(img_path)}"
        }

    idmap_path = os.path.join(data_dir, "embeddings", "id_map.json")
    with open(idmap_path, "w") as f:
        json.dump(id_map, f)
    print(f"[embed] Saved {len(id_map)} embeddings; wrote {idmap_path}", flush=True)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data_dir", default="data")
    ap.add_argument("--model", default="vit_small_patch14_dinov2",
                    help="Use vit_base_patch14_dinov2.lvd142m for best quality if bandwidth/VRAM allow")
    args = ap.parse_args()
    main(args.data_dir, args.model)
