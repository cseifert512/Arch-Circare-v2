# Arch-Circare Beta README (Render + Vercel)

## Overview
- Moderated remote study via URL (participant shares screen).
- Fixed corpus for 8 scored tasks (uploads disabled).
- Two scored tasks: participant uploads a massing screenshot as a transient query (not added to corpus; deleted immediately).
- Post-task explore: one optional upload (≤10 MB, JPG/PNG/PDF), temporary only.

## Requirements
- Python 3.10 or 3.11
- Node 18+
- CPU FAISS wheel (faiss-cpu) and PyTorch CPU are used by default

## Environment variables
API (Render):
- DATA_DIR: path to data folder (e.g., ../data)
- ALLOWED_ORIGINS: comma-separated UI origins (e.g., https://your-vercel-app.vercel.app)
- STUDY_TOKEN: invite token string (set in Render dashboard)
- MAX_UPLOAD_MB: 10
- ALLOW_PDF: true
- UPLOAD_TMP_DIR: /tmp

UI (Vercel):
- VITE_API_BASE_URL: https://<render-service>.onrender.com
- VITE_STUDY_TOKEN: same as API STUDY_TOKEN

## Local run (for development)
1) Backend
- cd Arch-Circare-v2/navigator
- python -m venv .venv && source .venv/bin/activate (Windows: .venv\\Scripts\\activate)
- pip install -r requirements.txt
- set env (PowerShell example):
  - $env:DATA_DIR="../data"
  - $env:ALLOWED_ORIGINS="http://127.0.0.1:5173"
  - $env:STUDY_TOKEN="dev-token"
- uvicorn app.main:app --reload

2) Frontend
- cd Arch-Circare-v2/ui
- npm ci
- set VITE_API_BASE_URL=http://127.0.0.1:8000 and VITE_STUDY_TOKEN=dev-token
- npm run dev

Health check: GET /healthz should return { ok: true } once warm.

## Study controls
- Upload gating via URL query param `phase`:
  - phase=scored: uploads disabled
  - phase=scored-upload: enables /upload/query-image (JPG/PNG only)
  - phase=explore: enables /upload/explore (JPG/PNG/PDF)
- Example study links (Vercel):
  - Scored (no upload): https://your-vercel-app.vercel.app/?phase=scored
  - Scored upload: https://your-vercel-app.vercel.app/?phase=scored-upload
  - Explore: https://your-vercel-app.vercel.app/?phase=explore
- Client sends Authorization: Bearer <VITE_STUDY_TOKEN>

## Deployment
### API (Render)
- Ensure `Arch-Circare-v2/render.yaml` exists in repo root.
- Create a new Web Service from repo; Render auto-detects `render.yaml`.
- Set env vars per above. If needed, add a small Disk and mount data read-only.

### UI (Vercel)
- Create project with root `Arch-Circare-v2/ui`
- Build command: npm ci && npm run build
- Output dir: dist
- Set env vars: VITE_API_BASE_URL, VITE_STUDY_TOKEN
- Ensure API origin is listed in ALLOWED_ORIGINS

## Data & verification
- Place dataset under `Arch-Circare-v2/data`:
  - embeddings/index.faiss, embeddings/image/*.npy, embeddings/patch/*.npy
  - metadata/projects.csv, metadata/spatial.csv, metadata/latent_2d.csv
  - images/<project_id>/*.jpg|png
- Use `scripts/verify_data.py` to validate presence/shape (optional dev step).

## Endpoints
- GET /healthz
- POST /search/file (legacy upload search)
- POST /upload/query-image (JPG/PNG only; transient)
- POST /upload/explore (JPG/PNG/PDF; transient)
- GET /projects, GET /projects/{project_id}/images
- POST /feedback (logs to data/logs/feedback.jsonl)

## QA checklist (10 min)
- Health: /healthz returns ok
- Token gate: requests without token are 401 (except /healthz)
- Scored: link with ?phase=scored blocks uploads
- Scored-upload: JPG/PNG works; PDF is rejected
- Explore: JPG/PNG/PDF work; response returns results; files are not persisted
- Latent map and grid render; filters apply; errors show user-friendly messages

## Moderator notes
- Share only Vercel study URLs; keep STUDY_TOKEN private.
- If CORS errors occur, update ALLOWED_ORIGINS in Render and redeploy.
- For performance hiccups, use /admin/reload-index (requires auth) to reload FAISS.

