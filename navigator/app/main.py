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
from app.patches import compute_query_patches, rerank_by_patches
from app.session import SessionStore, generate_query_id, compute_weight_nudges, apply_weight_nudges
from app.models import Feedback, Weights

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
_session_store: SessionStore | None = None

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

def get_session_store() -> SessionStore:
    global _session_store
    if _session_store is None:
        _session_store = SessionStore(DATA_DIR)
    return _session_store

def embed_pil(pil: Image.Image) -> np.ndarray:
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
            get_store()
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

def fuse_and_sort(results: List[dict], D: np.ndarray, weights: Weights, filters: Filters, 
                 strict: bool = False, query_spatial_features: Optional[List[float]] = None, 
                 store: Optional[FaissStore] = None) -> tuple[List[dict], dict]:
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
    
    # Generate query ID
    query_id = generate_query_id()
    
    t0 = time.time()
    D, I = st.search(q, body.top_k)
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
    
    return {
        "query_id": query_id,
        "latency_ms": ms,
        "weights": body.weights.model_dump(),
        "weights_effective": debug["weights_effective"],
        "filters": body.filters.model_dump(),
        "results": fused_results,
        "debug": debug
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
    w_spatial: float = 0.6,
    strict: bool = False,
    rerank: bool = False,
    re_topk: int = 50,
    patches: int = 16,
    mode: Optional[str] = None,
):
    st = get_store()
    try:
        pil = Image.open(file.file)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")
    
    # Determine search k based on reranking
    search_k = max(top_k, re_topk) if rerank else top_k
    
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
    
    # Apply patch reranking if requested
    debug_info = fusion_debug.copy()
    if rerank:
        rerank_t0 = time.time()
        
        # Compute query patches
        query_patches = compute_query_patches(pil, grid=4)
        
        # Rerank results
        reranked_results, rerank_debug = rerank_by_patches(
            fused_results, query_patches, re_topk, top_k, patches, DATA_DIR
        )
        
        rerank_ms = int((time.time() - rerank_t0) * 1000)
        debug_info.update({
            **rerank_debug,
            "rerank_latency_ms": rerank_ms,
            "rerank": "patch_min"
        })
        
        final_results = reranked_results
    else:
        final_results = fused_results[:top_k]
    
    # Combine debug info
    if debug_spatial is not None:
        debug_info["spatial"] = debug_spatial
    
    # Generate query ID
    query_id = generate_query_id()
    
    return {
        "query_id": query_id,
        "latency_ms": ms,
        "weights": w.model_dump(),
        "weights_effective": debug_info["weights_effective"],
        "filters": f.model_dump(),
        "results": final_results,
        "debug": debug_info
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
