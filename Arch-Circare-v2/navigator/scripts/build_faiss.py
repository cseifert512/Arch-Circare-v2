import os, glob, argparse, math, json
import numpy as np
import faiss

def l2n(X):
    n = np.linalg.norm(X, axis=1, keepdims=True) + 1e-12
    return X / n

def main(data_dir: str):
    """Build FAISS index from embeddings directory."""
    data_dir = os.path.abspath(data_dir)
    emb_dir = os.path.join(data_dir, "embeddings", "image")
    out_path = os.path.join(data_dir, "embeddings", "index.faiss")
    
    vec_paths = sorted(glob.glob(os.path.join(emb_dir, "*.npy")))
    if not vec_paths:
        raise RuntimeError(f"No embeddings found under {emb_dir}")

    print(f"[faiss] Loading {len(vec_paths)} embeddings...")
    X = np.stack([np.load(p).astype("float32") for p in vec_paths], axis=0)
    X = l2n(X)
    N, d = X.shape
    print(f"[faiss] vectors: N={N}, d={d}")

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
        m = 16 if d >= 256 else 8                        # PQ subvectors
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

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Build adaptive FAISS index from embeddings")
    ap.add_argument("--data_dir", default="data", help="Path to data folder containing /embeddings/image")
    args = ap.parse_args()
    main(args.data_dir)
