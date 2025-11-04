import os, json, time, threading
from typing import List, Dict, Any, Tuple, Optional
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
        self.spatial_csv = os.path.join(data_dir, "metadata", "spatial.csv")
        self._lock = threading.RLock()
        self._index = None
        self._idmap: Dict[str, Dict[str, str]] = {}
        self._projects = None
        self._spatial_features: Dict[str, List[float]] = {}
        self._spatial_normalizers: Dict[str, Tuple[float, float]] = {}
        self.reload()

    def _is_ivf(self, index) -> bool:
        # Works across faiss wrapper types
        return any("IndexIVF" in c.__name__ for c in type(index).mro())

    def _load_spatial_features(self):
        """Load and normalize spatial features from CSV."""
        self._spatial_features = {}
        if not os.path.exists(self.spatial_csv):
            return
        
        try:
            df = pd.read_csv(self.spatial_csv)
            
            # Store raw features
            for _, row in df.iterrows():
                project_id = row['project_id']
                self._spatial_features[project_id] = [
                    float(row['elongation']),
                    float(row['convexity']),
                    float(row['room_count']),
                    float(row['corridor_ratio'])
                ]
            
            # Compute normalization parameters
            if len(df) > 0:
                # elongation: log1p then min-max
                elongations = np.log1p(df['elongation'].values)
                self._spatial_normalizers['elongation'] = (elongations.min(), elongations.max())
                
                # convexity: already in [0,1], no normalization needed
                self._spatial_normalizers['convexity'] = (0.0, 1.0)
                
                # room_count: log1p then min-max
                room_counts = np.log1p(df['room_count'].values)
                self._spatial_normalizers['room_count'] = (room_counts.min(), room_counts.max())
                
                # corridor_ratio: min-max
                corridor_ratios = df['corridor_ratio'].values
                self._spatial_normalizers['corridor_ratio'] = (corridor_ratios.min(), corridor_ratios.max())
                
        except Exception as e:
            print(f"Warning: Failed to load spatial features: {e}")

    def _normalize_spatial_features(self, features: List[float]) -> List[float]:
        """Normalize spatial features to comparable scales."""
        if len(features) != 4 or not self._spatial_normalizers:
            return features
        
        elongation, convexity, room_count, corridor_ratio = features
        
        # elongation: log1p then min-max
        elong_norm = np.log1p(elongation)
        elong_min, elong_max = self._spatial_normalizers['elongation']
        elong_norm = (elong_norm - elong_min) / (elong_max - elong_min + 1e-12)
        
        # convexity: already in [0,1]
        convex_norm = convexity
        
        # room_count: log1p then min-max
        room_norm = np.log1p(room_count)
        room_min, room_max = self._spatial_normalizers['room_count']
        room_norm = (room_norm - room_min) / (room_max - room_min + 1e-12)
        
        # corridor_ratio: min-max
        corr_min, corr_max = self._spatial_normalizers['corridor_ratio']
        corr_norm = (corridor_ratio - corr_min) / (corr_max - corr_min + 1e-12)
        
        return [elong_norm, convex_norm, room_norm, corr_norm]

    def get_spatial_features(self, project_id: str) -> Optional[List[float]]:
        """Get normalized spatial features for a project."""
        if project_id not in self._spatial_features:
            return None
        raw_features = self._spatial_features[project_id]
        return self._normalize_spatial_features(raw_features)

    def spatial_distance(self, project_id1: str, project_id2: str) -> float:
        """Compute Euclidean distance between normalized spatial features."""
        features1 = self.get_spatial_features(project_id1)
        features2 = self.get_spatial_features(project_id2)
        
        if features1 is None or features2 is None:
            return 0.0  # Fallback to visual+attr only
        
        return np.linalg.norm(np.array(features1) - np.array(features2))

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
            # Load spatial features
            self._load_spatial_features()

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
                        "typology": r.get("typology"),
                        "climate_bin": r.get("climate_bin"),
                        "massing_type": r.get("massing_type"),
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
