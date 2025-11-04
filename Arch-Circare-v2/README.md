# Arch-Circare-v2

Active frontend: `ui-v2` (design-system based)

## Local development

Backend (FastAPI):

```bash
cd navigator
uvicorn app.main:app --reload --port 3000
```

Frontend (Vite):

```bash
cd ui-v2
npm i
npm run dev  # default http://localhost:5173
```

`ui-v2` proxies `/api` to `http://localhost:3000` in dev.

## Deployment

Render config uses `ui-v2` with `build` output (see `render.yaml`).
