from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
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

class SearchByVector(BaseModel):
    vector: List[float]
    top_k: int = 12

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
    return {"latency_ms": ms, "results": st.results_payload(D, I)}

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
async def search_file(file: UploadFile = File(...), top_k: int = 12):
    st = get_store()
    try:
        pil = Image.open(file.file)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")
    q = embed_pil(pil)
    t0 = time.time()
    D, I = st.search(q, top_k)
    ms = int((time.time() - t0) * 1000)
    return {"latency_ms": ms, "results": st.results_payload(D, I)}
