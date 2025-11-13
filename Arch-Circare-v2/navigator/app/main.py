from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Any
import os, time
import threading
import numpy as np
from PIL import Image
from io import BytesIO
import requests
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("navigator")

def l2n(x: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
    return x / n
from app.session import SessionStore, generate_query_id, compute_weight_nudges, apply_weight_nudges
from app.models import Feedback, Weights
from app.config import settings

# Spatial feature computation imports
try:
    from skimage import measure, morphology, filters, util
    from skimage.measure import label, regionprops
    from skimage.morphology import binary_closing, skeletonize
    from skimage.filters import threshold_otsu
    from scipy import ndimage
    SPATIAL_AVAILABLE = True
except ImportError:
    SPATIAL_AVAILABLE = False
    print("Warning: skimage/scipy not available, spatial features disabled")

DATA_DIR = settings.data_dir
app = FastAPI(title="Design Precedent Navigator API", version="0.2.0")

# Enable CORS (tighten to configured origins)
allowed_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Serve static assets (only mount if directories exist)
images_dir = os.path.join(DATA_DIR, "images")
plans_dir = os.path.join(DATA_DIR, "plans")
if os.path.isdir(images_dir):
    app.mount("/images", StaticFiles(directory=images_dir), name="images")
if os.path.isdir(plans_dir):
    app.mount("/plans", StaticFiles(directory=plans_dir), name="plans")

# ---- Lazy singletons ----
_store: Any | None = None
_model = None
_transform = None
_session_store: SessionStore | None = None

def get_store():
    global _store
    if _store is None:
        from app.faiss_service import FaissStore  # lazy import to avoid loading faiss at import time
        _store = FaissStore(DATA_DIR)
    return _store

def get_model_and_transform():
    global _model, _transform
    if _model is None:
        import timm  # defer heavy import
        model_name = os.getenv("MODEL_NAME", "vit_small_patch14_dinov2")
        model = timm.create_model(model_name, pretrained=True)
        model.eval(); model.reset_classifier(0)
        cfg = timm.data.resolve_data_config({}, model=model)
        _transform = timm.data.create_transform(**cfg, is_training=False)
        _model = model
    return _model, _transform

def get_session_store() -> SessionStore:
    global _session_store
    if _session_store is None:
        _session_store = SessionStore(DATA_DIR)
    return _session_store


def require_token(authorization: str | None = Header(None)):
    """Simple invite-token gate for study routes.
    Accepts Authorization: Bearer <token> or no-op if STUDY_TOKEN is unset.
    """
    token = settings.study_token
    if not token:
        return True
    provided = (authorization or "").replace("Bearer ", "").strip()
    if provided != token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

def embed_pil(pil: Image.Image) -> np.ndarray:
    import torch  # defer heavy import
    model, tfm = get_model_and_transform()
    with torch.no_grad():
        x = tfm(pil.convert("RGB")).unsqueeze(0)
        feat = model(x)
        vec = feat.cpu().numpy().astype("float32")
    return l2n(vec)[0]

def compute_spatial_features(pil: Image.Image) -> Optional[List[float]]:
    """Compute spatial features from a plan image."""
    if not SPATIAL_AVAILABLE:
        return None
    
    try:
        # Convert to grayscale
        gray = np.array(pil.convert("L"))
        
        # Extract floorplate mask
        # Simple thresholding approach
        threshold = threshold_otsu(gray)
        binary = gray < threshold
        
        # Clean up the binary image
        binary = binary_closing(binary)
        
        # Find largest connected component (assumed to be the floorplate)
        labeled = label(binary)
        if labeled.max() == 0:
            return None
        
        props = regionprops(labeled)
        largest_comp = max(props, key=lambda x: x.area)
        floorplate = labeled == largest_comp.label
        
        # Compute spatial metrics
        # Elongation = major_axis_length / minor_axis_length
        elongation = largest_comp.major_axis_length / largest_comp.minor_axis_length
        
        # Convexity = area(floorplate) / area(convex_hull)
        hull = morphology.convex_hull_image(floorplate)
        convexity = largest_comp.area / np.sum(hull)
        convexity = np.clip(convexity, 0.0, 1.0)
        
        # Extract space mask (floorplate minus thickened walls)
        edges = morphology.binary_dilation(floorplate) & ~floorplate
        thickened_edges = morphology.binary_dilation(edges, morphology.disk(3))
        space_mask = floorplate & ~thickened_edges
        
        # Room count = connected components with sufficient area
        min_area = 0.002 * largest_comp.area  # 0.2% of floorplate area
        space_labeled = label(space_mask)
        space_props = regionprops(space_labeled)
        room_count = sum(1 for p in space_props if p.area >= min_area)
        
        # Corridor ratio = skeleton density
        if np.sum(space_mask) > 0:
            skeleton = skeletonize(space_mask)
            corridor_ratio = np.sum(skeleton) / np.sum(space_mask)
        else:
            corridor_ratio = 0.0
        
        return [elongation, convexity, room_count, corridor_ratio]
        
    except Exception as e:
        print(f"Error computing spatial features: {e}")
        return None

# Non-blocking warm-up on startup so health is instant
@app.on_event("startup")
async def _startup_warm():
    def _warm():
        try:
            disable_index_warm = os.getenv("DISABLE_INDEX_WARMUP", "true").lower() == "true"
            if not disable_index_warm:
                get_store()
            # Optionally warm model depending on env (default disabled on low-memory plans)
            disable_model_warm = os.getenv("DISABLE_MODEL_WARMUP", "true").lower() == "true"
            if not disable_model_warm:
                get_model_and_transform()
            get_session_store()
        except Exception:
            # Avoid crashing startup on warm errors
            pass
    threading.Thread(target=_warm, daemon=True).start()

# Sprint A: Updated request models
class Filters(BaseModel):
    typology: Optional[str] = None
    climate_bin: Optional[str] = None
    massing_type: Optional[str] = None

class SearchOpts(BaseModel):
    top_k: int = 12
    weights: Weights = Weights()
    filters: Filters = Filters()
    strict: bool = False
    mode: Optional[str] = None

class SearchById(BaseModel):
    image_id: str
    top_k: int = 12
    weights: Weights = Weights()
    filters: Filters = Filters()
    strict: bool = False
    mode: Optional[str] = None
    lens_ids: Optional[List[str]] = None
    lens_projects: Optional[List[str]] = None

class SearchByVector(BaseModel):
    vector: List[float]
    top_k: int = 12

def renorm_weights(wv: float, ws: float, wa: float, has_spatial: bool) -> np.ndarray:
    """Normalize weights, zeroing missing signals and re-normalizing to sum to 1."""
    w = np.array([wv, ws if has_spatial else 0.0, wa], dtype="float32")
    w = np.maximum(w, 0)  # Ensure non-negative
    s = w.sum()
    return (w / s) if s > 0 else np.array([1, 0, 0], dtype="float32")

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

def apply_lens(results: List[dict], lens_ids: Optional[List[str]] = None, 
               lens_projects: Optional[List[str]] = None, top_k: int = 12) -> List[dict]:
    """Apply neighborhood lens filtering to search results."""
    if not lens_ids and not lens_projects:
        return results[:top_k]
    
    keep = []
    lid = set(lens_ids or [])
    lpr = set(lens_projects or [])
    
    for r in results:
        if (lid and r["image_id"] in lid) or (lpr and r["project_id"] in lpr):
            keep.append(r)
        if len(keep) >= top_k:
            break
    
    return keep if keep else results[:top_k]

def fuse_and_sort(results: List[dict], D: np.ndarray, weights: Weights, filters: Filters, 
                 strict: bool = False, query_spatial_features: Optional[List[float]] = None, 
                 store: Optional[Any] = None) -> tuple[List[dict], dict]:
    """
    Fuse scores using effective weights and return results with debug info.
    Returns: (sorted_results, debug_info)
    """
    # Normalize visual distances (FAISS distances)
    dv = np.array(D, dtype="float32")
    if dv.size > 1:
        dv = (dv - dv.min()) / (dv.max() - dv.min() + 1e-12)
    else:
        dv = np.zeros_like(dv)

    # Determine if spatial features are available
    has_spatial = query_spatial_features is not None and store is not None
    
    # Compute effective weights
    w_eff = renorm_weights(weights.visual, weights.spatial, weights.attr, has_spatial)
    
    # Store baseline visual-only ranking for comparison
    baseline_ranking = [r["image_id"] for r in results[:len(dv)]]
    
    fused = []
    for j, r in enumerate(results):
        da = attr_distance(r, filters)
        if strict and da > 0.0:
            continue
        
        # Compute spatial distance if available
        ds = 0.0
        if has_spatial and r.get("project_id"):
            candidate_features = store.get_spatial_features(r["project_id"])
            if candidate_features is not None:
                ds = np.linalg.norm(np.array(query_spatial_features) - np.array(candidate_features))
        
        # Fuse score (lower is better)
        score = w_eff[0] * float(dv[j]) + w_eff[1] * float(ds) + w_eff[2] * float(da)
        fused.append((score, r))
    
    fused.sort(key=lambda x: x[0])
    sorted_results = [r for _, r in fused]
    
    # Compute debug information
    debug = {
        "weights_requested": {
            "visual": weights.visual,
            "spatial": weights.spatial,
            "attr": weights.attr
        },
        "weights_effective": {
            "visual": float(w_eff[0]),
            "spatial": float(w_eff[1]),
            "attr": float(w_eff[2])
        },
        "rerank": "none",
        "moved": 0
    }
    
    # Calculate how many ranks changed vs baseline
    if len(sorted_results) >= len(baseline_ranking):
        new_ranking = [r["image_id"] for r in sorted_results[:len(baseline_ranking)]]
        moved = sum(1 for i, (old, new) in enumerate(zip(baseline_ranking, new_ranking)) if old != new)
        debug["moved"] = moved
    
    return sorted_results, debug

@app.get("/healthz")
def healthz():
    # Lightweight health check; avoid loading heavy subsystems
    return {"ok": True}

@app.get("/latent/points")
def latent_points():
    """Get 2-D latent space coordinates for all images."""
    import pandas as pd
    p = os.path.join(DATA_DIR, "metadata", "latent_2d.csv")
    if not os.path.exists(p):
        return {"results": []}
    df = pd.read_csv(p)
    # Handle NaN values by converting to empty strings
    df = df.fillna("")
    return {"results": df.to_dict(orient="records")}

@app.post("/admin/reload-index")
def reload_index():
    try:
        get_store().reload()
        return {"ok": True, "msg": "Index reloaded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search/id")
def search_id(body: SearchById, _: bool = Depends(require_token)):
    st = get_store()
    try:
        q = st.vector_for_image(body.image_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    # Generate query ID
    query_id = generate_query_id()
    
    # Determine search k based on lens filtering
    search_k = max(body.top_k * 5, len(body.lens_ids or []) * 2, len(body.lens_projects or []) * 6, 100)
    
    t0 = time.time()
    D, I = st.search(q, search_k)
    ms = int((time.time() - t0) * 1000)
    hydrated = st.results_payload(D, I)
    
    # Compute spatial features if in plan mode
    query_spatial_features = None
    if body.mode == "plan" or body.mode == "true":
        # For ID search, we need to get the image and compute features
        # This is a simplified approach - in practice you might want to store pre-computed features
        pass
    
    fused_results, debug = fuse_and_sort(hydrated, D, body.weights, body.filters, 
                                        strict=body.strict, 
                                        query_spatial_features=query_spatial_features, 
                                        store=st)
    
    # Apply lens filtering
    lensed_results = apply_lens(fused_results, body.lens_ids, body.lens_projects, body.top_k)
    
    # Add lens debug info
    debug["lens"] = {
        "ids": len(body.lens_ids or []),
        "projects": len(body.lens_projects or [])
    }
    
    return {
        "query_id": query_id,
        "latency_ms": ms,
        "weights": body.weights.model_dump(),
        "weights_effective": debug["weights_effective"],
        "filters": body.filters.model_dump(),
        "results": lensed_results,
        "debug": debug
    }

@app.get("/projects")
def list_projects(_: bool = Depends(require_token)):
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
def list_project_images(project_id: str, _: bool = Depends(require_token)):
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
def search_vector(body: SearchByVector, _: bool = Depends(require_token)):
    st = get_store()
    q = np.array(body.vector, dtype="float32")
    if q.ndim != 1:
        raise HTTPException(status_code=400, detail="Vector must be 1-D")
    t0 = time.time()
    D, I = st.search(q, body.top_k)
    ms = int((time.time() - t0) * 1000)
    return {"latency_ms": ms, "results": st.results_payload(D, I)}

@app.get("/search/url")
def search_url(
    url: str = Query(..., description="Public image URL to search by"),
    top_k: int = 12,
    typology: Optional[str] = None,
    climate_bin: Optional[str] = None,
    massing_type: Optional[str] = None,
    w_visual: float = 1.0,
    w_attr: float = 0.25,
    w_spatial: float = 0.6,
    strict: bool = False,
    rerank: bool = False,
    re_topk: int = 50,
    patches: int = 16,
    mode: Optional[str] = None,
    lens_ids: Optional[str] = None,
    lens_projects: Optional[str] = None,
    _: bool = Depends(require_token),
):
    """Search using an image available at a remote URL (server-side fetch to avoid client CORS)."""
    st = get_store()
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        pil = Image.open(BytesIO(r.content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch image: {e}")

    # Parse lens parameters
    lens_ids_list = None
    lens_projects_list = None
    if lens_ids:
        lens_ids_list = [x.strip() for x in lens_ids.split(",") if x.strip()]
    if lens_projects:
        lens_projects_list = [x.strip() for x in lens_projects.split(",") if x.strip()]

    # Determine search k based on reranking and lens filtering
    search_k = max(top_k, re_topk) if rerank else top_k
    search_k = max(search_k, top_k * 5, len(lens_ids_list or []) * 2, len(lens_projects_list or []) * 6, 100)

    q = embed_pil(pil)
    t0 = time.time()
    D, I = st.search(q, search_k)
    ms = int((time.time() - t0) * 1000)
    hydrated = st.results_payload(D, I)
    f = Filters(typology=typology, climate_bin=climate_bin, massing_type=massing_type)
    w = Weights(visual=w_visual, attr=w_attr, spatial=w_spatial)

    # Compute spatial features if in plan mode
    query_spatial_features = None
    if mode == "plan" or mode == "true":
        query_spatial_features = compute_spatial_features(pil)

    fused_results, debug = fuse_and_sort(hydrated, D, w, f, strict=strict,
                                         query_spatial_features=query_spatial_features, store=st)

    # Apply lens filtering
    lensed_results = apply_lens(fused_results, lens_ids_list, lens_projects_list, top_k)

    query_id = generate_query_id()
    logger.info(f"/search/url query_id={query_id} url={url} top_k={top_k} latency_ms={ms}")
    return {
        "query_id": query_id,
        "latency_ms": ms,
        "weights": w.model_dump(),
        "weights_effective": debug.get("weights_effective", {}),
        "filters": f.model_dump(),
        "results": lensed_results,
        "debug": debug
    }
@app.post("/search/file")
async def search_file(
    file: UploadFile = File(...),
    top_k: int = 12,
    typology: Optional[str] = None,
    climate_bin: Optional[str] = None,
    massing_type: Optional[str] = None,
    w_visual: float = 1.0,
    w_attr: float = 0.25,
    w_spatial: float = 0.6,
    strict: bool = False,
    rerank: bool = False,
    re_topk: int = 50,
    patches: int = 16,
    mode: Optional[str] = None,
    lens_ids: Optional[str] = None,
    lens_projects: Optional[str] = None,
    _: bool = Depends(require_token),
):
    st = get_store()
    try:
        pil = Image.open(file.file)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")
    
    # Parse lens parameters
    lens_ids_list = None
    lens_projects_list = None
    if lens_ids:
        lens_ids_list = [x.strip() for x in lens_ids.split(",") if x.strip()]
    if lens_projects:
        lens_projects_list = [x.strip() for x in lens_projects.split(",") if x.strip()]
    
    # Determine search k based on reranking and lens filtering
    search_k = max(top_k, re_topk) if rerank else top_k
    search_k = max(search_k, top_k * 5, len(lens_ids_list or []) * 2, len(lens_projects_list or []) * 6, 100)
    
    q = embed_pil(pil)
    t0 = time.time()
    D, I = st.search(q, search_k)
    ms = int((time.time() - t0) * 1000)
    hydrated = st.results_payload(D, I)
    f = Filters(typology=typology, climate_bin=climate_bin, massing_type=massing_type)
    w = Weights(visual=w_visual, attr=w_attr, spatial=w_spatial)
    
    # Compute spatial features if in plan mode
    query_spatial_features = None
    debug_spatial = None
    if mode == "plan" or mode == "true":
        query_spatial_features = compute_spatial_features(pil)
        if query_spatial_features is not None:
            # Create debug info with query features and top-3 candidates
            debug_spatial = {
                "query_features": {
                    "elongation": query_spatial_features[0],
                    "convexity": query_spatial_features[1],
                    "room_count": query_spatial_features[2],
                    "corridor_ratio": query_spatial_features[3]
                },
                "top_candidates": []
            }
            
            # Add top-3 candidates' spatial features
            for i, result in enumerate(hydrated[:3]):
                if result.get("project_id"):
                    candidate_features = st.get_spatial_features(result["project_id"])
                    if candidate_features is not None:
                        debug_spatial["top_candidates"].append({
                            "rank": i + 1,
                            "project_id": result["project_id"],
                            "features": {
                                "elongation": candidate_features[0],
                                "convexity": candidate_features[1],
                                "room_count": candidate_features[2],
                                "corridor_ratio": candidate_features[3]
                            }
                        })
    
    # Use new fusion function
    fused_results, fusion_debug = fuse_and_sort(hydrated, D, w, f, strict=strict, 
                                               query_spatial_features=query_spatial_features, store=st)
    
    # Apply lens filtering
    lensed_results = apply_lens(fused_results, lens_ids_list, lens_projects_list, top_k)
    
    # Apply patch reranking if requested
    debug_info = fusion_debug.copy()
    if rerank:
        from app.patches import compute_query_patches, rerank_by_patches
        rerank_t0 = time.time()
        
        # Compute query patches
        query_patches = compute_query_patches(pil, grid=4)
        
        # Rerank results
        reranked_results, rerank_debug = rerank_by_patches(
            lensed_results, query_patches, re_topk, top_k, patches, DATA_DIR
        )
        
        rerank_ms = int((time.time() - rerank_t0) * 1000)
        debug_info.update({
            **rerank_debug,
            "rerank_latency_ms": rerank_ms,
            "rerank": "patch_min"
        })
        
        final_results = reranked_results
    else:
        final_results = lensed_results
    
    # Combine debug info
    if debug_spatial is not None:
        debug_info["spatial"] = debug_spatial
    
    # Add lens debug info
    debug_info["lens"] = {
        "ids": len(lens_ids_list or []),
        "projects": len(lens_projects_list or [])
    }
    
    # Generate query ID
    query_id = generate_query_id()
    logger.info(f"/search/file query_id={query_id} top_k={top_k} latency_ms={ms}")
    
    return {
        "query_id": query_id,
        "latency_ms": ms,
        "weights": w.model_dump(),
        "weights_effective": debug_info["weights_effective"],
        "filters": f.model_dump(),
        "results": final_results,
        "debug": debug_info
    }

# ---- Study-specific upload endpoints ----

def _validate_size(content: bytes):
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File too large. Max {settings.max_upload_mb} MB")


@app.post("/upload/query-image")
async def upload_query_image(
    file: UploadFile = File(...),
    top_k: int = 12,
    typology: Optional[str] = None,
    climate_bin: Optional[str] = None,
    massing_type: Optional[str] = None,
    w_visual: float = 1.0,
    w_attr: float = 0.25,
    w_spatial: float = 0.6,
    strict: bool = False,
    rerank: bool = False,
    re_topk: int = 50,
    patches: int = 16,
    mode: Optional[str] = None,
    lens_ids: Optional[str] = None,
    lens_projects: Optional[str] = None,
    session_id: Optional[str] = None,
    _: bool = Depends(require_token),
):
    # Validate content type (images only)
    if file.content_type not in {"image/jpeg", "image/png", "image/jpg"}:
        raise HTTPException(status_code=415, detail="Only JPG/PNG images are allowed for this task")
    content = await file.read()
    _validate_size(content)

    # Open PIL from bytes; no persistence
    try:
        pil = Image.open(BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Delegate to search logic (same as /search/file)
    st = get_store()

    # Parse lens parameters
    lens_ids_list = [x.strip() for x in (lens_ids or "").split(",") if x.strip()] or None
    lens_projects_list = [x.strip() for x in (lens_projects or "").split(",") if x.strip()] or None

    search_k = max(top_k, re_topk) if rerank else top_k
    search_k = max(search_k, top_k * 5, len(lens_ids_list or []) * 2, len(lens_projects_list or []) * 6, 100)

    q = embed_pil(pil)
    t0 = time.time()
    D, I = st.search(q, search_k)
    ms = int((time.time() - t0) * 1000)
    hydrated = st.results_payload(D, I)
    f = Filters(typology=typology, climate_bin=climate_bin, massing_type=massing_type)
    w = Weights(visual=w_visual, attr=w_attr, spatial=w_spatial)

    query_spatial_features = None
    debug_spatial = None
    if mode == "plan" or mode == "true":
        query_spatial_features = compute_spatial_features(pil)
        if query_spatial_features is not None:
            debug_spatial = {
                "query_features": {
                    "elongation": query_spatial_features[0],
                    "convexity": query_spatial_features[1],
                    "room_count": query_spatial_features[2],
                    "corridor_ratio": query_spatial_features[3],
                },
                "top_candidates": [],
            }
            for i, result in enumerate(hydrated[:3]):
                if result.get("project_id"):
                    candidate_features = st.get_spatial_features(result["project_id"])
                    if candidate_features is not None:
                        debug_spatial["top_candidates"].append({
                            "rank": i + 1,
                            "project_id": result["project_id"],
                            "features": {
                                "elongation": candidate_features[0],
                                "convexity": candidate_features[1],
                                "room_count": candidate_features[2],
                                "corridor_ratio": candidate_features[3],
                            },
                        })

    fused_results, fusion_debug = fuse_and_sort(
        hydrated, D, w, f, strict=strict, query_spatial_features=query_spatial_features, store=st
    )
    lensed_results = apply_lens(fused_results, lens_ids_list, lens_projects_list, top_k)

    debug_info = fusion_debug.copy()
    if rerank:
        from app.patches import compute_query_patches, rerank_by_patches
        rerank_t0 = time.time()
        query_patches = compute_query_patches(pil, grid=4)
        reranked_results, rerank_debug = rerank_by_patches(
            lensed_results, query_patches, re_topk, top_k, patches, DATA_DIR
        )
        rerank_ms = int((time.time() - rerank_t0) * 1000)
        debug_info.update({**rerank_debug, "rerank_latency_ms": rerank_ms, "rerank": "patch_min"})
        final_results = reranked_results
    else:
        final_results = lensed_results

    if debug_spatial is not None:
        debug_info["spatial"] = debug_spatial
    debug_info["lens"] = {"ids": len(lens_ids_list or []), "projects": len(lens_projects_list or [])}

    query_id = generate_query_id()

    # No persistence: content is discarded, nothing written to corpus
    return {
        "query_id": query_id,
        "latency_ms": ms,
        "weights": w.model_dump(),
        "weights_effective": debug_info.get("weights_effective", {}),
        "filters": f.model_dump(),
        "results": final_results,
        "debug": debug_info,
    }


@app.post("/upload/explore")
async def upload_explore(
    file: UploadFile = File(...),
    top_k: int = 12,
    w_visual: float = 1.0,
    w_attr: float = 0.25,
    w_spatial: float = 0.6,
    mode: Optional[str] = None,
    session_id: Optional[str] = None,
    _: bool = Depends(require_token),
):
    # Accept JPG/PNG/PDF; convert PDF first page to image
    content = await file.read()
    _validate_size(content)

    pil: Image.Image | None = None
    if file.content_type in {"image/jpeg", "image/png", "image/jpg"}:
        try:
            pil = Image.open(BytesIO(content))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
    elif file.content_type == "application/pdf":
        if not settings.allow_pdf:
            raise HTTPException(status_code=415, detail="PDF uploads are disabled")
        try:
            import pypdfium2 as pdfium  # type: ignore
            pdf = pdfium.PdfDocument(BytesIO(content))
            page = pdf[0]
            pil = page.render(scale=2).to_pil()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid PDF file")
    else:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    st = get_store()
    q = embed_pil(pil)
    t0 = time.time()
    D, I = st.search(q, top_k)
    ms = int((time.time() - t0) * 1000)
    hydrated = st.results_payload(D, I)
    f = Filters()
    w = Weights(visual=w_visual, attr=w_attr, spatial=w_spatial)

    query_spatial_features = None
    if mode == "plan" or mode == "true":
        query_spatial_features = compute_spatial_features(pil)

    final_results, debug_info = fuse_and_sort(hydrated, D, w, f, strict=False, 
                                              query_spatial_features=query_spatial_features, store=st)
    query_id = generate_query_id()
    return {
        "query_id": query_id,
        "latency_ms": ms,
        "weights": w.model_dump(),
        "weights_effective": debug_info.get("weights_effective", {}),
        "filters": f.model_dump(),
        "results": final_results,
        "debug": debug_info,
    }

@app.post("/feedback")
def feedback(body: Feedback):
    """Handle user feedback and update session weights"""
    session_store = get_session_store()
    
    # Get current session
    session_data = session_store.get_session(body.session_id)
    weights_before = session_data.weights
    
    # Compute nudges based on feedback
    nudges = compute_weight_nudges(
        liked=body.liked,
        disliked=body.disliked,
        weights_before=weights_before,
        debug_info=None  # We could store debug info in session for more sophisticated nudging
    )
    
    # Apply nudges to get new weights
    weights_after = apply_weight_nudges(weights_before, nudges)
    
    # Update session
    session_store.update_session(body.session_id, body.query_id, weights_after)
    
    # Log the feedback event
    session_store.log_feedback(
        session_id=body.session_id,
        query_id=body.query_id,
        liked=body.liked,
        disliked=body.disliked,
        weights_before=weights_before,
        weights_after=weights_after
    )
    
    # Format nudges for response
    nudges_formatted = {
        "visual": f"{nudges['visual']:+.2f}",
        "spatial": f"{nudges['spatial']:+.2f}",
        "attr": f"{nudges['attr']:+.2f}"
    }
    
    return {
        "ok": True,
        "session_id": body.session_id,
        "query_id": body.query_id,
        "weights_after": weights_after.model_dump(),
        "nudges": nudges_formatted
    }
