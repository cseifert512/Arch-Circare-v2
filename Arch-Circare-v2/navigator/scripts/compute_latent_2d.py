# scripts/compute_latent_2d.py
import os, json, argparse, numpy as np, pandas as pd
from pathlib import Path

def main(data_dir, method="umap", seed=42):
    E = Path(data_dir)/"embeddings"/"image"
    idmap = json.load(open(Path(data_dir)/"embeddings"/"id_map.json","r",encoding="utf-8"))
    vecs, ids = [], []
    
    for k in sorted(idmap, key=lambda z:int(z)):
        iid = idmap[k]["image_id"]
        p = E/f"{iid}.npy"
        if p.exists():
            vecs.append(np.load(p).astype("float32"))
            ids.append(int(k))
    
    X = np.stack(vecs,0)
    print(f"Loaded {len(vecs)} embeddings with shape {X.shape}")
    
    # reduce
    if method=="umap":
        from umap import UMAP
        print("Running UMAP...")
        Y = UMAP(n_neighbors=15, min_dist=0.1, random_state=seed).fit_transform(X)
    else:
        from sklearn.manifold import TSNE
        print("Running t-SNE...")
        Y = TSNE(perplexity=15, learning_rate="auto", init="pca", random_state=seed).fit_transform(X)
    
    # normalize to [-1,1]
    Y = (Y - Y.min(0)) / (Y.max(0) - Y.min(0) + 1e-12)
    Y = (Y*2.0) - 1.0
    
    # hydrate
    proj = pd.read_csv(Path(data_dir)/"metadata"/"projects.csv")
    rows = []
    
    for faiss_id, (x,y) in zip(ids, Y):
        m = idmap[str(faiss_id)]
        pid = m["project_id"]
        r = proj[proj.project_id==pid]
        rows.append(dict(
            faiss_id=faiss_id,
            image_id=m["image_id"],
            project_id=pid,
            x=float(x), y=float(y),
            thumb_url=m.get("thumb",""),
            title=(r.iloc[0]["title"] if not r.empty else ""),
            country=(r.iloc[0]["country"] if not r.empty else ""),
            typology=(r.iloc[0]["typology"] if not r.empty else ""),
        ))
    
    # Write CSV
    out_csv = Path(data_dir)/"metadata"/"latent_2d.csv"
    df = pd.DataFrame(rows)
    df.to_csv(out_csv, index=False)
    print(f"Wrote {out_csv} with {len(rows)} rows.")
    
    # Write JSON (optional)
    out_json = Path(data_dir)/"metadata"/"latent_2d.json"
    df.to_json(out_json, orient="records", indent=2)
    print(f"Wrote {out_json} with {len(rows)} records.")

if __name__=="__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data_dir", default="data")
    ap.add_argument("--method", choices=["umap","tsne"], default="umap")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    main(args.data_dir, args.method, args.seed)
