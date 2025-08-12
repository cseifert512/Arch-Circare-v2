import os, json, time, threading
from typing import List, Dict, Any, Tuple
import numpy as np
import faiss
import pandas as pd

def l2n(x: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
    return x / n

class FaissStore:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.emb_dir = os.path.join(data_dir, "embeddings", "image")
        self.index_path = os.path.join(data_dir, "embeddings", "index.faiss")
        self.idmap_path = os.path.join(data_dir, "embeddings", "id_map.json")
        self.meta_csv  = os.path.join(data_dir, "metadata", "projects.csv")
        self._lock = threading.RLock()
        self._index = None
        self._idmap: Dict[str, Dict[str, str]] = {}
        self._projects = None
        self.reload()

    def _is_ivf(self, index) -> bool:
        # Works across faiss wrapper types
        return any("IndexIVF" in c.__name__ for c in type(index).mro())

    def reload(self):
        with self._lock:
            if not os.path.exists(self.index_path):
                raise FileNotFoundError(f"Missing index at {self.index_path}")
            self._index = faiss.read_index(self.index_path)
            # Tune nprobe if IVF
            if self._is_ivf(self._index):
                nprobe = int(os.getenv("FAISS_NPROBE", "8"))
                # clamp nprobe sanely if nlist is available
                try:
                    nlist = int(getattr(self._index, "nlist"))
                    nprobe = max(1, min(nprobe, max(1, nlist // 2)))
                except Exception:
                    pass
                setattr(self._index, "nprobe", nprobe)
            # Load id_map
            with open(self.idmap_path, "r", encoding="utf-8") as f:
                self._idmap = json.load(f)
            # Load projects.csv for hydration
            if os.path.exists(self.meta_csv):
                self._projects = pd.read_csv(self.meta_csv)
            else:
                self._projects = pd.DataFrame([])

    def _hydrate(self, idxs: List[int]) -> List[Dict[str, Any]]:
        rows = []
        idmap = self._idmap
        prj = self._projects
        for i in idxs:
            meta = idmap.get(str(i), {})
            pid = meta.get("project_id")
            row = {"image_id": meta.get("image_id"),
                   "project_id": pid,
                   "thumb_url": meta.get("thumb")}
            if prj is not None and not prj.empty and pid is not None:
                hit = prj[prj["project_id"] == pid]
                if not hit.empty:
                    r = hit.iloc[0].to_dict()
                    row.update({
                        "title": r.get("title"),
                        "country": r.get("country"),
                        "typology": r.get("typology")
                    })
            rows.append(row)
        return rows

    def search(self, q: np.ndarray, top_k: int = 12) -> Tuple[np.ndarray, np.ndarray]:
        q = q.astype("float32")
        if q.ndim == 1:
            q = q[None, :]
        q = l2n(q)
        with self._lock:
            D, I = self._index.search(q, top_k)
        return D[0], I[0]

    def vector_for_image(self, image_id: str) -> np.ndarray:
        path = os.path.join(self.emb_dir, f"{image_id}.npy")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Embedding not found for {image_id}")
        return np.load(path).astype("float32")

    def results_payload(self, D: np.ndarray, I: np.ndarray) -> List[Dict[str, Any]]:
        out = []
        hydrated = self._hydrate([int(i) for i in I.tolist()])
        for rank, (dist, idx, meta) in enumerate(zip(D.tolist(), I.tolist(), hydrated), start=1):
            out.append({
                "rank": rank,
                "distance": float(dist),
                "faiss_id": int(idx),
                **meta
            })
        return out
