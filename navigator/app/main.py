from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os, time
import threading
import numpy as np
import torch, timm
from PIL import Image

from app.faiss_service import FaissStore, l2n

DATA_DIR = os.getenv("DATA_DIR", "data")
app = FastAPI(title="Design Precedent Navigator API", version="0.2.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static assets
app.mount("/images", StaticFiles(directory=os.path.join(DATA_DIR, "images")), name="images")
app.mount("/plans", StaticFiles(directory=os.path.join(DATA_DIR, "plans")), name="plans")

# ---- Lazy singletons ----
_store: FaissStore | None = None
_model = None
_transform = None

def get_store() -> FaissStore:
    global _store
    if _store is None:
        _store = FaissStore(DATA_DIR)
    return _store

def get_model_and_transform():
    global _model, _transform
    if _model is None:
        model_name = os.getenv("MODEL_NAME", "vit_small_patch14_dinov2")
        model = timm.create_model(model_name, pretrained=True)
        model.eval(); model.reset_classifier(0)
        cfg = timm.data.resolve_data_config({}, model=model)
        _transform = timm.data.create_transform(**cfg, is_training=False)
        _model = model
    return _model, _transform

def embed_pil(pil: Image.Image) -> np.ndarray:
    model, tfm = get_model_and_transform()
    with torch.no_grad():
        x = tfm(pil.convert("RGB")).unsqueeze(0)
        feat = model(x)
        vec = feat.cpu().numpy().astype("float32")
    return l2n(vec)[0]

# Non-blocking warm-up on startup so health is instant
@app.on_event("startup")
async def _startup_warm():
    def _warm():
        try:
            get_store()
            get_model_and_transform()
        except Exception:
            # Avoid crashing startup on warm errors
            pass
    threading.Thread(target=_warm, daemon=True).start()

class SearchById(BaseModel):
    image_id: str
    top_k: int = 12
    # Sprint A options
    class Filters(BaseModel):
        typology: Optional[str] = None
        climate_bin: Optional[str] = None
        massing_type: Optional[str] = None

    class Weights(BaseModel):
        visual: float = 1.0
        attr: float = 0.25

    filters: Filters = Filters()
    weights: Weights = Weights()
    strict: bool = False

class SearchByVector(BaseModel):
    vector: List[float]
    top_k: int = 12

class Filters(BaseModel):
    typology: Optional[str] = None
    climate_bin: Optional[str] = None
    massing_type: Optional[str] = None

class Weights(BaseModel):
    visual: float = 1.0
    attr: float = 0.25

class SearchOpts(BaseModel):
    top_k: int = 12
    filters: Filters = Filters()
    weights: Weights = Weights()
    strict: bool = False

def attr_distance(row: dict, f: Filters) -> float:
    checks: List[bool] = []
    if f.typology:
        checks.append(row.get("typology") == f.typology)
    if f.climate_bin:
        checks.append(row.get("climate_bin") == f.climate_bin)
    if f.massing_type:
        checks.append(row.get("massing_type") == f.massing_type)
    if not checks:
        return 0.0
    mismatches = sum(1 for ok in checks if not ok)
    return mismatches / len(checks)

def fuse_and_sort(results: List[dict], D: np.ndarray, weights: Weights, filters: Filters, strict: bool = False) -> List[dict]:
    dv = np.array(D, dtype="float32")
    if dv.size > 1:
        dv = (dv - dv.min()) / (dv.max() - dv.min() + 1e-12)
    else:
        dv = np.zeros_like(dv)

    fused = []
    for j, r in enumerate(results):
        da = attr_distance(r, filters)
        if strict and da > 0.0:
            continue
        score = weights.visual * float(dv[j]) + weights.attr * float(da)
        fused.append((score, r))
    fused.sort(key=lambda x: x[0])
    return [r for _, r in fused]

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/admin/reload-index")
def reload_index():
    try:
        get_store().reload()
        return {"ok": True, "msg": "Index reloaded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search/id")
def search_id(body: SearchById):
    st = get_store()
    try:
        q = st.vector_for_image(body.image_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    t0 = time.time()
    D, I = st.search(q, body.top_k)
    ms = int((time.time() - t0) * 1000)
    hydrated = st.results_payload(D, I)
    fused = fuse_and_sort(hydrated, D, body.weights, body.filters, strict=body.strict)
    return {
        "latency_ms": ms,
        "weights": body.weights.model_dump(),
        "filters": body.filters.model_dump(),
        "results": fused
    }

@app.get("/projects")
def list_projects():
    """Get all projects with their metadata"""
    store = get_store()
    if store._projects is None or store._projects.empty:
        return []
    
    projects = []
    for _, row in store._projects.iterrows():
        projects.append({
            "project_id": row.get("project_id"),
            "title": row.get("title"),
            "country": row.get("country"),
            "typology": row.get("typology"),
            "climate_bin": row.get("climate_bin"),
            "massing_type": row.get("massing_type"),
            "wwr_band": row.get("wwr_band")
        })
    return projects

@app.get("/projects/{project_id}/images")
def list_project_images(project_id: str):
    images_dir = os.path.join(DATA_DIR, "images", project_id)
    if not os.path.isdir(images_dir):
        raise HTTPException(status_code=404, detail=f"Project images not found: {project_id}")
    exts = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}
    files = [f for f in os.listdir(images_dir) if os.path.splitext(f)[1] in exts]
    files.sort()
    out = []
    for fname in files:
        stem, _ = os.path.splitext(fname)
        image_id = f"i_{project_id}_{stem}"
        out.append({
            "image_id": image_id,
            "filename": fname,
            "url": f"/images/{project_id}/{fname}"
        })
    return {"project_id": project_id, "images": out}

@app.post("/search/vector")
def search_vector(body: SearchByVector):
    st = get_store()
    q = np.array(body.vector, dtype="float32")
    if q.ndim != 1:
        raise HTTPException(status_code=400, detail="Vector must be 1-D")
    t0 = time.time()
    D, I = st.search(q, body.top_k)
    ms = int((time.time() - t0) * 1000)
    return {"latency_ms": ms, "results": st.results_payload(D, I)}

@app.post("/search/file")
async def search_file(
    file: UploadFile = File(...),
    top_k: int = 12,
    typology: Optional[str] = None,
    climate_bin: Optional[str] = None,
    massing_type: Optional[str] = None,
    w_visual: float = 1.0,
    w_attr: float = 0.25,
    strict: bool = False,
):
    st = get_store()
    try:
        pil = Image.open(file.file)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")
    q = embed_pil(pil)
    t0 = time.time()
    D, I = st.search(q, top_k)
    ms = int((time.time() - t0) * 1000)
    hydrated = st.results_payload(D, I)
    f = Filters(typology=typology, climate_bin=climate_bin, massing_type=massing_type)
    w = Weights(visual=w_visual, attr=w_attr)
    fused = fuse_and_sort(hydrated, D, w, f, strict=strict)
    return {
        "latency_ms": ms,
        "weights": w.model_dump(),
        "filters": f.model_dump(),
        "results": fused
    }
