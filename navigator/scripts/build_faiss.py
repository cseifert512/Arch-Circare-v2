import os, glob, argparse, math, json
import numpy as np
import faiss

def l2n(X):
    n = np.linalg.norm(X, axis=1, keepdims=True) + 1e-12
    return X / n

def main(emb_dir: str, out_path: str, nlist: int = 4096, m: int = 16):
    """Build FAISS index from embeddings directory."""
    vec_paths = sorted(glob.glob(os.path.join(emb_dir, "*.npy")))
    if not vec_paths:
        raise RuntimeError(f"No embeddings found under {emb_dir}")

    print(f"[faiss] Loading {len(vec_paths)} embeddings...")
    X = np.stack([np.load(p).astype("float32") for p in vec_paths], axis=0)
    X = l2n(X)
    N, d = X.shape
    print(f"[faiss] vectors: N={N}, d={d}")

    # Load or create idmap
    idmap_path = os.path.join(os.path.dirname(emb_dir), "idmap.json")
    if os.path.exists(idmap_path):
        with open(idmap_path, 'r') as f:
            idmap = json.load(f)
        print(f"[faiss] Loaded idmap with {len(idmap)} entries")
    else:
        # Create simple idmap from filenames
        idmap = {}
        for i, vec_path in enumerate(vec_paths):
            image_id = os.path.splitext(os.path.basename(vec_path))[0]
            idmap[str(i)] = image_id
        print(f"[faiss] Created idmap from filenames")

    # Create output directory
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # Super small sets → FlatL2 (no training)
    if N < 64:
        print("[faiss] N < 64 → using IndexFlatL2 (no training).")
        index = faiss.IndexFlatL2(d)
        index.add(X)
        faiss.write_index(index, out_path)
        print(f"[faiss] Wrote {out_path}")
    # Small/medium sets → IVF-Flat (light training)
    elif N < 500:
        nlist = min(max(16, int(math.sqrt(N))), N)  # ensure nlist <= N
        print(f"[faiss] 64 ≤ N < 500 → using IndexIVFFlat with nlist={nlist}")
        quantizer = faiss.IndexFlatL2(d)
        index = faiss.IndexIVFFlat(quantizer, d, nlist, faiss.METRIC_L2)
        # Train on all points (since small)
        index.train(X)
        index.add(X)
        index.nprobe = max(1, min(nlist // 8, 16))
        faiss.write_index(index, out_path)
        print(f"[faiss] Wrote {out_path}")
    # Larger sets → IVF+PQ
    else:
        nlist = min(max(64, int(math.sqrt(N) * 8)), N)   # cap by N
        m = min(m, d)  # ensure m <= d
        print(f"[faiss] N ≥ 500 → using IndexIVFPQ with nlist={nlist}, m={m}")
        quantizer = faiss.IndexFlatL2(d)
        index = faiss.IndexIVFPQ(quantizer, d, nlist, m, 8)
        # Train on a subset but ≥ nlist
        train_size = max(nlist, min(10000, N))
        rs = np.random.RandomState(0)
        train_idx = rs.choice(N, train_size, replace=False)
        index.train(X[train_idx])
        index.add(X)
        index.nprobe = max(1, min(nlist // 8, 32))
        faiss.write_index(index, out_path)
        print(f"[faiss] Wrote {out_path}")

    # Save idmap to index directory
    index_idmap_path = os.path.join(os.path.dirname(out_path), "idmap.json")
    with open(index_idmap_path, 'w') as f:
        json.dump(idmap, f, indent=2)
    print(f"[faiss] Wrote idmap to {index_idmap_path}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Build FAISS index from embeddings")
    ap.add_argument("--emb_dir", required=True, help="Directory containing .npy embeddings")
    ap.add_argument("--out", required=True, help="Output path for FAISS index")
    ap.add_argument("--nlist", type=int, default=4096, help="Number of clusters for IVF (default: 4096)")
    ap.add_argument("--m", type=int, default=16, help="Number of subvectors for PQ (default: 16)")
    args = ap.parse_args()
    main(args.emb_dir, args.out, args.nlist, args.m)

