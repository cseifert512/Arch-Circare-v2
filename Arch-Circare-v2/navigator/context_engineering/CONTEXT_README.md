Context‑Engineering Pack — Design Precedent Navigator (14‑Day Sprint)
Owner: Clay Seifert
Environment: Windows (PowerShell), Python 3.10+
Agent: Cursor (non‑autonomous; human‑in‑the‑loop)
Goal of this Pack: Provide a stable, detailed frame of reference so the agent understands project scope, module interdependencies, data contracts, and execution steps. The agent should not deviate from these unless a human adds CHANGE APPROVED in a commit or instruction.

0) How to Use This Pack
Keep this file in /context-engineering/CONTEXT_README.md and link to it from the repo README.
The agent should read sections 1–7 before coding. Sections 8–12 are runbooks and conventions used during daily execution.
When requirements change, update here first. Any change to schema/API/stack requires the string CHANGE APPROVED in the commit message.

1) Project Definition
What we’re building: an MVP Design Precedent Navigator that retrieves architectural precedents by visual similarity (images/plans), basic spatial metrics, and coarse attributes. The UI exposes a tri‑slider to weight these three signals and a small set of filters (typology, climate_bin, massing_type). The system returns a ranked list plus a brief “why similar” grounded in known data.
In‑scope (MVP):
Image and plan embeddings (DINOv2 family acceptable; do not swap during sprint without approval).
Vector index using FAISS IVF+PQ (or HNSW if IVF proves untenable on target hardware). Persist indices to disk.
Patch‑level re‑rank for the top‑k results to improve motif matching.
Coarse attributes: typology, climate_bin, massing_type, wwr_band.
Lightweight spatial metrics computed from plan images or simple masks: room_count, corridor_ratio, elongation, compactness.
API: /search, /projects/:id, /feedback, /explain/:id.
Minimal dataset target: ≥300 projects, each with ≥3 images, ≥1 plan when possible.
Out‑of‑scope (MVP): energy/performance simulation, parametric generation, complex semantic segmentation, multi‑language text search, user accounts.
Quality/Performance Targets:
Pre‑rerank latency for top‑50: < 1.0s on dev laptop.
Patch rerank overhead: isolated and logged; target < 250ms for k≤50 (if exceeded, reduce k or patch grid).
Basic retrieval sanity: at least 3 curated demo queries return intuitive neighbors.

2) Architecture Overview
Layers:
Data Layer — images, plans, metadata CSV/JSON; embeddings .npy; FAISS index files.
Embedding Services — batch and on‑the‑fly embedding with DINOv2; optional patch embedding.
Index Layer — FAISS wrapper (build/load/search); optional HNSW toggle behind the same interface.
Search Pipeline — candidate retrieval (visual), optional neighborhood restrict, attribute/spatial fusion, patch rerank, final scoring.
API (FastAPI) — endpoints exposing search and introspection.
Client — existing latent‑space viewer, results grid, controls.
Data Flow (happy path):
images/plans → embed_batch.py → embeddings/*.npy → build_index.py → faiss.index
query image → /embed (optional) → vector → /search → FAISS top‑k → fusion + rerank → response
Key Interdependencies:
embed_batch.py must produce embeddings with the same dimensionality/config as index/faiss_store.py expects.
search/pipeline.py requires both index and features/spatial.py, features/attributes.py to be importable and version‑matched to the data schema.
/search endpoint owns normalization of weights and delegates to pipeline.search(); no other module should re‑implement fusion logic.

3) Repository & Folder Layout (authoritative)
/ app/
  main.py                  # FastAPI app and routers
  config.py                # Settings via pydantic (reads .env)
  models.py                # Pydantic models for requests/responses
  routers/
    search.py              # /search, /feedback
    projects.py            # /projects/:id, /explain/:id
  services/
    embedder.py            # get_embedding(image|bytes|path)
    index_store.py         # build/load/search wrapper around FAISS
    pipeline.py            # fusion scoring, patch rerank
    features/
      spatial.py           # plan metrics (room_count, etc.)
      attributes.py        # distance on coarse attributes
      patches.py           # extract/encode patches for rerank
  utils/
    io.py                  # image I/O, preprocessing
    logging.py             # structlog or stdlib logging config

/ data/
  images/{project_id}/...  # source imagery (jpg/png)
  plans/{project_id}/...   # plan imagery (png)
  metadata/projects.csv    # authoritative tabular metadata
  metadata/projects.jsonl  # optional detailed per‑project docs

/ embeddings/
  image/*.npy              # global image embeddings (one row per image)
  patch/*.npy              # optional patch embeddings

/ index/
  faiss_ivfpq.index        # persisted FAISS index
  idmap.json               # map from vector row → image_id → project_id

/ scripts/
  embed_batch.py           # batch embed images/plans
  build_index.py           # train/build FAISS index
  verify_data.py           # sanity checks for counts/paths/schema

/ tools/
  metrics.py               # P@k, nDCG@k, latency harness

/ context-engineering/
  CONTEXT_README.md        # this file
  AGENT_PROTOCOL.md        # prompts, SOPs, guardrails
  API_SPEC.md              # endpoints + schemas
  DATA_CONTRACTS.md        # csv/json schemas + examples
  RUNBOOKS.md              # ingest/reindex/benchmark playbooks
  CONVENTIONS.md           # coding/logging/test/versioning
  DECISION_LOG.md          # running log of changes
Do not change folder names or file purposes without CHANGE APPROVED.

4) Data Contracts (authoritative)
4.1 File Layout & IDs
IDs:
project_id: stable slug (e.g., p_000123).
image_id: project_id + filename slug (e.g., p_000123_hero).
Paths: images in /data/images/{project_id}/*.jpg|png; plans in /data/plans/{project_id}/*.png.
4.2 metadata/projects.csv
Required columns (no renames without approval):
project_id,title,country,climate_bin,typology,massing_type,wwr_band,image_ids,plan_ids,tags
image_ids: |‑separated list (e.g., p_1_img1|p_1_img2).
plan_ids: optional |‑separated list.
tags: optional |‑separated keywords (no spaces in tokens).
Validation rules:
Every image_id in CSV must resolve to an image file.
climate_bin ∈ {hot-humid, hot-arid, temperate, cold} (extend only with approval).
massing_type ∈ {bar, slab, perimeter_block, tower, courtyard}.
wwr_band ∈ {low, medium, high}.
4.3 Embeddings
Image embedding: float32 numpy arrays, shape (N, D) with a companion idmap.json of length N mapping row → image_id.
Patch embedding: If used, same D, with idmap_patches.json mapping row → image_id + patch_idx.
Dimensionality (D) must stay constant across index builds.
4.4 Pydantic Models (reference)
# app/models.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class Weights(BaseModel):
    visual: float = Field(0.6, ge=0.0, le=1.0)
    spatial: float = Field(0.2, ge=0.0, le=1.0)
    attr:   float = Field(0.2, ge=0.0, le=1.0)

class Filters(BaseModel):
    typology: Optional[List[str]] = None
    climate_bin: Optional[List[str]] = None
    massing_type: Optional[List[str]] = None

class SearchRequest(BaseModel):
    # Provide either query_image_id or query_vector
    query_image_id: Optional[str] = None
    query_vector: Optional[List[float]] = None
    weights: Weights = Weights()
    filters: Filters = Filters()
    k: int = 50

class WhyBlock(BaseModel):
    patch_match: Optional[Dict] = None  # {image_id, patch_idx, score}
    attr_hits: Optional[Dict[str, str]] = None

class SearchResult(BaseModel):
    project_id: str
    image_id: str
    score: float
    thumb_url: str
    why: WhyBlock = WhyBlock()

class SearchResponse(BaseModel):
    results: List[SearchResult]

class Feedback(BaseModel):
    query_id: str
    liked: List[str] = []  # image_ids
    disliked: List[str] = []

5) Execution Stack & Inter‑Module Contracts
5.1 Embedding Service (services/embedder.py)
Responsibilities:
Load model at startup; expose get_embedding(image_bytes|path) -> np.ndarray[D].
Deterministic preprocessing (resize, normalize). Keep transformation frozen for the sprint.
Batch API for scripts; single inference for /embed.
5.2 Index Store (services/index_store.py)
Responsibilities:
Build: train IVF quantizer, add vectors, write .index + idmap.json.
Load: lazy‑load index on app start; expose search(vec, k) -> List[(row_idx, dist)].
Thread‑safe search (use a lock or GIL‑safe calls). Optionally memory‑map if large.
5.3 Features
features/spatial.py: compute room_count, corridor_ratio, elongation, compactness from plan images; fallback to zeros if plan missing. Expose spatial_vector(project_id) -> np.ndarray[4] with caching.
features/attributes.py: define categorical distance (0 if match, 1 otherwise) and aggregate to a scalar d_attr.
features/patches.py: given a candidate image, tile to a fixed grid (e.g., 4×4 or 8×8), embed patches, compute min patch distance against query patches. Expose patch_rerank(query, candidates) -> re_scored_candidates.
5.4 Search Pipeline (services/pipeline.py)
Order of operations:
Candidate retrieval (visual): FAISS search on query vector → (ids, d_visual).
Attribute distance: compute d_attr per candidate (respect filters; hard filter first, then distance for remaining candidates).
Spatial distance: compute d_spatial between spatial_vector(query_project?) and candidate (if query is an image without project, set spatial weight to 0 unless the user provided a plan‑based reference).
Fusion: D = w_v*d_visual + w_s*d_spatial + w_a*d_attr with normalized weights.
Patch rerank: take top‑k′ (≤50), refine scores with min patch distance blended (e.g., 70/30 between fusion and patch score).
Return: sorted results + why block (best patch hit + attribute matches).
Single source of truth for fusion lives here; no other module should recompute it.

6) API Surface (fixed for the sprint)
6.1 POST /search
Body: SearchRequest
Returns: SearchResponse
Notes:
Validate that one of query_image_id or query_vector is present.
Normalize weights to sum to 1 and clamp each to [0.1, 0.7] when any are non‑zero.
Apply filters strictly before scoring.
6.2 POST /embed
Input: file upload or URL. Returns: embedding vector (list of floats). Not required for normal UI flow but useful for tests and scripts.
6.3 POST /feedback
Session‑scoped adjustment of weights (±0.05 within clamps). Do not persist globally.
6.4 GET /projects/{id}
Return minimal project card (title, country, attributes, image thumbnails list, plan list).
6.5 GET /explain/{id}
Return a 2–3 sentence explanation grounded only in known tags/metrics used in scoring; never fabricate.

7) Configuration, Logging, and Errors
7.1 Config (app/config.py)
Read from .env with fallbacks:
MODEL_NAME (e.g., facebook/dinov2-base or local weight path)
EMB_DIM (e.g., 768)
FAISS_NLIST (e.g., 4096), FAISS_M (e.g., 16)
TOPK_DEFAULT (e.g., 50)
PATCH_GRID (e.g., 4 or 8)
7.2 Logging (stdlib or structlog)
Use JSON logs. Fields: ts, lvl, evt, latency_ms, k, stage (search_pre, fusion, patch_rerank).
Log one line per search request with aggregate timings and top result ids.
7.3 Error Handling
All endpoints must return structured error JSON: {error_code, message, details?}.
422 for invalid inputs; 500 for internal with correlation id.
scripts/verify_data.py must fail‑fast on missing files, mismatched dims, or orphaned ids.

8) Runbooks (Daily Use)
8.1 First‑Time Setup (PowerShell)
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
mkdir data\images data\plans embeddings\image embeddings\patch index data\metadata
8.2 Ingest & Embed
# Verify data health
python scripts\verify_data.py --images data\images --plans data\plans --metadata data\metadata\projects.csv

# Embed all images (and plans if present)
python scripts\embed_images.py --images data\images --plans data\plans --out embeddings\image --out_patches embeddings\patch --grid 4
8.3 Build Index
python scripts\build_index.py --emb_dir embeddings\image --out index\faiss_ivfpq.index --nlist 4096 --m 16
8.4 Run API
uvicorn app.main:app --reload --port 8000
8.5 Benchmark (quick)
python tools\metrics.py --gold bench\gold.json --k 10 --weights 0.6 0.2 0.2

9) Agent Protocol (non‑autonomous guardrails)
The agent must not modify schema, folder layout, or API signatures without a human commit containing CHANGE APPROVED.
When a task requires touching multiple modules, emit a short Task Plan first (bulleted steps with files to edit) and proceed once it matches this pack.
If a script finds 0 files to process, it must log a clear message and exit non‑zero.
For ambiguous requirements, ask one clarification; otherwise follow the default in this pack.
9.1 Task Template (Agent)
Read relevant sections of this pack.
Draft a 5–8 line Task Plan listing modules to touch and function signatures.
Implement with small commits.
Run verify_data.py or unit tests as applicable.
Post a brief summary: what changed, why, and how to roll back.

10) Conventions
10.1 Coding
Use pathlib for paths, Pillow/opencv for I/O, numpy for arrays, faiss for index.
Keep functions < 50 lines where possible; one responsibility each.
Type hints everywhere; docstrings explain inputs/outputs and side effects.
10.2 Testing
Unit tests for: embedder.get_embedding, index_store.search, features.*, and pipeline.fuse_scores.
Integration smoke: test_search_smoke.py that loads 20 images and validates response shape and monotonic score order.
10.3 Versioning & Decision Log
Semantic commits: feat:, fix:, chore:, docs:.
Update /context-engineering/DECISION_LOG.md for any change that could affect another module.

11) Minimal Stubs (drop‑in skeletons)
11.1 app/services/pipeline.py
from typing import List, Tuple
import numpy as np

class Pipeline:
    def __init__(self, index_store, attr_mod, spatial_mod, patch_mod, cfg):
        self.index = index_store
        self.attr = attr_mod
        self.spatial = spatial_mod
        self.patch = patch_mod
        self.cfg = cfg

    def normalize_weights(self, w):
        total = max(1e-9, w.visual + w.spatial + w.attr)
        v, s, a = w.visual/total, w.spatial/total, w.attr/total
        clamp = lambda x: min(max(x, 0.1), 0.7)
        return clamp(v), clamp(s), clamp(a)

    def search(self, qvec: np.ndarray, filters: dict, weights, k: int = 50):
        ids, dvis = self.index.search(qvec, k)
        ids, dvis = self._apply_filters(ids, dvis, filters)
        dattr = self.attr.distances(ids)
        dspa  = self.spatial.distances(ids)
        wv, ws, wa = self.normalize_weights(weights)
        fused = wv*np.array(dvis) + ws*np.array(dspa) + wa*np.array(dattr)
        # Patch rerank on top‑k′
        topk_prime = min(k, 50)
        re_ids, re_scores = self.patch.rerank(qvec, ids[:topk_prime], fused[:topk_prime])
        # Merge back (keep re‑ranked ordering for top‑k′, append rest)
        final_ids = re_ids + ids[topk_prime:]
        final_scores = re_scores + list(fused[topk_prime:])
        return list(zip(final_ids, final_scores))

    def _apply_filters(self, ids: List[int], dvis: List[float], filters: dict):
        # implement strict filtering by attributes; this function must be pure
        return ids, dvis
11.2 app/services/index_store.py
import faiss, numpy as np, json
from pathlib import Path

class IndexStore:
    def __init__(self, index_path: Path, idmap_path: Path):
        self.index = faiss.read_index(str(index_path))
        self.idmap = json.loads(Path(idmap_path).read_text())  # row_idx -> image_id

    def search(self, qvec: np.ndarray, k: int):
        q = qvec.astype(np.float32)[None, :]
        D, I = self.index.search(q, k)
        return I[0].tolist(), D[0].tolist()
11.3 scripts/verify_data.py
import sys
from pathlib import Path
import pandas as pd

def main(images, plans, metadata):
    images_p = Path(images); plans_p = Path(plans); meta_p = Path(metadata)
    csv = pd.read_csv(meta_p)
    missing = []
    for _, row in csv.iterrows():
        for img_id in str(row.image_ids).split('|'):
            pid, fname = img_id.split('_', 1)[0], None
            # naive check: look for any file starting with img_id in the project folder
            proj_dir = images_p / row.project_id
            if not proj_dir.exists() or not any(p.stem.startswith(img_id) for p in proj_dir.glob('*')):
                missing.append(img_id)
    if missing:
        print(f"Missing {len(missing)} image files. Examples: {missing[:5]}")
        sys.exit(1)
    print("verify_data: OK")

if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--images', required=True)
    ap.add_argument('--plans', required=True)
    ap.add_argument('--metadata', required=True)
    args = ap.parse_args()
    main(args.images, args.plans, args.metadata)

12) Daily Execution Checklist (short)

13) Appendix: API Examples
13.1 /search request (by image id)
{
  "query_image_id": "p_000123_hero",
  "weights": {"visual": 0.6, "spatial": 0.2, "attr": 0.2},
  "filters": {"typology": ["housing"], "climate_bin": ["hot-humid"]},
  "k": 50
}
13.2 /search response (truncated)
{
  "results": [
    {
      "project_id": "p_000127",
      "image_id": "p_000127_hero",
      "score": 0.213,
      "thumb_url": "/static/p_000127/hero_thumb.jpg",
      "why": {"patch_match": {"patch_idx": 5, "score": 0.12}, "attr_hits": {"climate_bin": "match"}}
    }
  ]
}
13.3 Error JSON
{"error_code": "INVALID_REQUEST", "message": "Provide query_image_id or query_vector"}

Final Notes
This pack is the single source of truth for the sprint. Update first; code second.
If in doubt, keep it simple, keep it measurable, and keep modules loosely‑coupled with clear, typed interfaces.

