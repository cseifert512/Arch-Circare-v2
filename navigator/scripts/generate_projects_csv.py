import csv, os, glob, ast
from pathlib import Path

DATA = Path("data")
IMG_ROOT = DATA/"images"
CSV_PATH = DATA/"metadata"/"projects.csv"

REQ = ["project_id","title","country","climate_bin","typology","massing_type","wwr_band","image_ids","plan_ids","tags"]

def load_existing():
    rows = {}
    if CSV_PATH.exists():
        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            r = csv.DictReader(f)
            for row in r:
                rows[row["project_id"]] = row
    return rows

def default_row(pid, imgs):
    # map filenames to image_ids (prefix i_ with project_id)
    image_ids = [f"i_{pid}_{Path(p).stem}" for p in imgs]
    return {
        "project_id": pid,
        "title": pid.replace("_"," ").title(),
        "country": "unknown",
        "climate_bin": "unknown",
        "typology": "unknown",
        "massing_type": "unknown",
        "wwr_band": "unknown",
        "image_ids": str(image_ids),
        "plan_ids": "[]",
        "tags": "[]",
    }

def main():
    existing = load_existing()
    # collect all jpg/png per project
    projects = {}
    for pdir in sorted(IMG_ROOT.glob("*")):
        if pdir.is_dir():
            imgs = sorted(glob.glob(str(pdir/"*.jpg"))) + sorted(glob.glob(str(pdir/"*.jpeg"))) + sorted(glob.glob(str(pdir/"*.png")))
            if imgs:
                projects[pdir.name] = imgs

    # merge defaults with existing rows
    merged = {}
    for pid, imgs in projects.items():
        row = existing.get(pid, default_row(pid, imgs))
        # if existing row, update image_ids minimally to include any new files
        try:
            current_ids = set(ast.literal_eval(row.get("image_ids","[]")))
        except Exception:
            current_ids = set()
        found_ids = {f"i_{pid}_{Path(p).stem}" for p in imgs}
        row["image_ids"] = str(sorted(current_ids.union(found_ids)))
        merged[pid] = row

    # write CSV
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=REQ)
        w.writeheader()
        for pid in sorted(merged.keys()):
            w.writerow(merged[pid])
    print(f"Wrote {CSV_PATH} with {len(merged)} rows.")

if __name__ == "__main__":
    main()
