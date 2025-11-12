import csv, os, glob, ast, json
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

def clean_title(s: str) -> str:
    # Remove leading 'P ' if present and trailing numeric id (6-8 digits)
    out = s.strip()
    if out.startswith("P "):
        out = out[2:]
    # strip trailing numeric code
    parts = out.split()
    if parts and parts[-1].isdigit() and 6 <= len(parts[-1]) <= 8:
        parts = parts[:-1]
    out = " ".join(parts)
    return out.strip()

def default_row(pid, imgs, meta_title: str | None):
    # map filenames to image_ids (prefix i_ with project_id)
    image_ids = [f"i_{pid}_{Path(p).stem}" for p in imgs]
    fallback = pid.replace("_"," ")
    # Title-case the fallback but do not force meta titles
    title = meta_title if meta_title else fallback.title()
    title = clean_title(title)
    return {
        "project_id": pid,
        "title": title,
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
    meta_root = DATA/"metadata"
    for pid, imgs in projects.items():
        # Try to read metadata JSON for a nicer title
        meta_title = None
        meta_path = meta_root/f"{pid}.json"
        if meta_path.exists():
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                meta_title = meta.get("projectTitle") or meta.get("project_title") or None
            except Exception:
                meta_title = None

        row = existing.get(pid, default_row(pid, imgs, meta_title))
        # if existing row, update image_ids minimally to include any new files
        try:
            current_ids = set(ast.literal_eval(row.get("image_ids","[]")))
        except Exception:
            current_ids = set()
        found_ids = {f"i_{pid}_{Path(p).stem}" for p in imgs}
        row["image_ids"] = str(sorted(current_ids.union(found_ids)))
        # Refresh title from metadata if available
        if meta_title:
            row["title"] = clean_title(str(meta_title))
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
