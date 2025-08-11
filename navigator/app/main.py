from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import faiss, json, os
from PIL import Image
import torch, timm
from torchvision import transforms
import pandas as pd

DATA_DIR = os.getenv("DATA_DIR", "data")
EMB_DIR = os.path.join(DATA_DIR, "embeddings", "image")
META_CSV = os.path.join(DATA_DIR, "metadata", "projects.csv")
INDEX_PATH = os.path.join(DATA_DIR, "embeddings", "index.faiss")
IDMAP_PATH = os.path.join(DATA_DIR, "embeddings", "id_map.json")

app = FastAPI(title="Design Precedent Navigator API", version="0.1.0")

# --- Lazy singletons ---
_model = None
_transform = None
_index = None
_id_map = None
_projects = None

def get_model_and_transform():
    global _model, _transform
    if _model is None:
        model = timm.create_model('vit_base_patch14_dinov2.lvd142m', pretrained=True)
        model.eval()
        model.reset_classifier(0)  # forward returns pooled features
        _model = model
        cfg = timm.data.resolve_data_config({}, model=model)
        _transform = timm.data.create_transform(**cfg, is_training=False)
    return _model, _transform

def l2n(x: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
    return x / n

def load_index():
    global _index, _id_map, _projects
    if _index is None:
        if not os.path.exists(INDEX_PATH) or not os.path.exists(IDMAP_PATH):
            raise RuntimeError("FAISS index or id_map missing. Run the embedding + index scripts.")
        _index = faiss.read_index(INDEX_PATH)
        with open(IDMAP_PATH, "r") as f:
            _id_map = json.load(f)  # {"0": {"image_id": "i_0001", "project_id": "p_0001", "thumb": "..."}}
        _projects = pd.read_csv(META_CSV)
    return _index, _id_map, _projects

def embed_pil(pil_img: Image.Image) -> np.ndarray:
    model, tfm = get_model_and_transform()
    with torch.no_grad():
        x = tfm(pil_img.convert("RGB")).unsqueeze(0)
        feat = model(x)
        vec = feat.cpu().numpy().astype("float32")
        return l2n(vec)

class SearchById(BaseModel):
    image_id: str
    top_k: int = 12

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/search/file")
async def search_file(file: UploadFile = File(...), top_k: int = 12):
    try:
        pil = Image.open(file.file)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")
    q = embed_pil(pil)  # (1, d)
    index, id_map, _ = load_index()
    D, I = index.search(q, top_k)
    res = []
    for rank, (dist, idx) in enumerate(zip(D[0].tolist(), I[0].tolist())):
        meta = id_map.get(str(idx), {})
        res.append({
            "rank": rank+1,
            "score": float(dist),
            "image_id": meta.get("image_id"),
            "project_id": meta.get("project_id"),
            "thumb_url": meta.get("thumb"),
        })
    return {"results": res}

@app.post("/search/id")
def search_id(body: SearchById):
    index, id_map, _ = load_index()
    # load existing vector for image_id
    vec_path = os.path.join(EMB_DIR, f"{body.image_id}.npy")
    if not os.path.exists(vec_path):
        raise HTTPException(status_code=404, detail="Embedding for image_id not found.")
    q = np.load(vec_path).astype("float32")[None, :]
    q = l2n(q)
    D, I = index.search(q, body.top_k)
    res = []
    for rank, (dist, idx) in enumerate(zip(D[0].tolist(), I[0].tolist())):
        meta = id_map.get(str(idx), {})
        res.append({
            "rank": rank+1,
            "score": float(dist),
            "image_id": meta.get("image_id"),
            "project_id": meta.get("project_id"),
            "thumb_url": meta.get("thumb"),
        })
    return {"results": res}

@app.get("/projects/{project_id}")
def get_project(project_id: str):
    _, _, projects = load_index()
    row = projects[projects["project_id"] == project_id]
    if row.empty:
        raise HTTPException(status_code=404, detail="project not found")
    return row.to_dict(orient="records")[0]

class Feedback(BaseModel):
    query_id: Optional[str] = None
    liked: List[str] = []
    disliked: List[str] = []

@app.post("/feedback")
def feedback(body: Feedback):
    # D1: no-op; D9 will adjust session weights + log tuples
    return {"ok": True, "msg": "Feedback recorded (stub)."}
