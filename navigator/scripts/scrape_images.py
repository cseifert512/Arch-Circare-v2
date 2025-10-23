#!/usr/bin/env python3
import os, re, csv, json, time, argparse, hashlib, pathlib, mimetypes
import requests

BING_ENDPOINT = "https://api.bing.microsoft.com/v7.0/images/search"

# ---------- Helpers ----------
def slugify(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')

def ensure_dir(p): pathlib.Path(p).mkdir(parents=True, exist_ok=True)

def sha1_of_bytes(b): return hashlib.sha1(b).hexdigest()

def guess_ext(url, fmt=None, ctype=None):
    if fmt: return "." + fmt.lower().split("/")[-1].split(".")[-1]
    if ctype and '/' in ctype:
        ext = mimetypes.guess_extension(ctype.split(";")[0].strip())
        if ext: return ext
    m = re.search(r'\.(png|jpe?g|webp|gif|tif?f)(?:\?|$)', url, re.I)
    return "." + m.group(1).lower() if m else ".jpg"

def save_json(p, obj):
    with open(p, "w", encoding="utf-8") as f: json.dump(obj, f, ensure_ascii=False, indent=2)

def read_projects(meta_path, fmt):
    if fmt == "csv":
        with open(meta_path, newline="", encoding="utf-8") as f:
            r = csv.DictReader(f)
            for row in r:
                pid = (row.get("project_id") or "").strip()
                title = (row.get("title") or "").strip()
                country = (row.get("country") or "").strip()
                yield {"project_id": pid, "title": title, "country": country}
    else:  # ndjson
        with open(meta_path, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    obj = json.loads(line)
                    yield {"project_id": obj["project_id"], "title": obj.get("title",""), "country": obj.get("country","")}

def bing_search(key, query, count=10, safe="Moderate", extra=None):
    headers = {"Ocp-Apim-Subscription-Key": key}
    params = {"q": query, "count": count, "safeSearch": safe, "setLang":"en"}
    if extra: params.update(extra)
    r = requests.get(BING_ENDPOINT, headers=headers, params=params, timeout=20)
    r.raise_for_status()
    return r.json().get("value", [])

def download(url, timeout=30):
    r = requests.get(url, timeout=timeout, headers={"User-Agent":"archipedia-image-agent/0.1"})
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type"), r.url

def select_best(cands):
    # Prefer largest image with working contentUrl; fall back by width*height if present
    def size_score(c):
        w = c.get("width") or 0; h = c.get("height") or 0
        return (w*h, w, h)
    return sorted(cands, key=size_score, reverse=True)[:1]  # top 1

# ---------- Query strategies ----------
def queries_for(project_title, country=""):
    t = project_title
    base = f"\"{t}\""
    hero_q = f"{base} exterior OR outside {country}".strip()
    facade_q = f"{base} facade elevation {country}".strip()
    # Add synonyms for plan; bias toward line-art + mono to net more drawings
    plan_q = f"{base} floor plan OR plans OR drawing OR 'ground floor plan' {country}".strip()
    return hero_q, facade_q, plan_q

def fetch_slot(key, q, out_dir, max_per_type=1, force_line=False):
    extra = {}
    # Bias queries for plans toward line art and monochrome to surface drawings
    if force_line:
        extra.update({"imageType":"Line", "color":"Monochrome"})
    results = bing_search(key, q, count=max(20, max_per_type*10), extra=extra)
    picked = select_best(results)

    saved = []
    for item in picked[:max_per_type]:
        content_url = item.get("contentUrl") or item.get("thumbnailUrl")
        if not content_url: continue
        try:
            blob, ctype, final_url = download(content_url)
        except Exception as e:
            print("   ! download fail:", e); continue

        ext = guess_ext(final_url or content_url, item.get("encodingFormat"), ctype)
        h = sha1_of_bytes(blob)[:10]
        fname = f"{slugify(item.get('name') or 'img')}_{h}{ext}"
        fpath = os.path.join(out_dir, fname)
        with open(fpath, "wb") as f: f.write(blob)

        meta = {
            "source":"bing",
            "query": q,
            "originalUrl": content_url,
            "finalUrl": final_url,
            "file": fname,
            "width": item.get("width"),
            "height": item.get("height"),
            "encodingFormat": item.get("encodingFormat"),
            "hostPageUrl": item.get("hostPageUrl"),
            "hostPageDisplayUrl": item.get("hostPageDisplayUrl"),
            "license": item.get("license"),  # often None from Bing; keep for record
            "provider": (item.get("provider") or [{}])[0].get("name") if item.get("provider") else None
        }
        saved.append({"path": fpath, "meta": meta})
        time.sleep(0.2)  # be gentle
    return saved

# ---------- Main ----------
def main():
    ap = argparse.ArgumentParser(description="Download hero/facade/floorplan images per project.")
    ap.add_argument("--data_dir", default="data", help="Path to data directory")
    ap.add_argument("--metadata", default="data/metadata/projects.csv", help="CSV with project_id,title,country")
    ap.add_argument("--format", choices=["csv","ndjson"], help="Force input format; else infer")
    ap.add_argument("--max-per-type", type=int, default=3, help="Images per slot (default: 3 for hero/facade/plan)")
    ap.add_argument("--api-key", default=os.getenv("BING_SUBSCRIPTION_KEY"), help="Bing Image Search key (or set env BING_SUBSCRIPTION_KEY)")
    ap.add_argument("--dry-run", action="store_true", help="Don't download; only print queries")
    ap.add_argument("--rename-main", action="store_true", help="Rename best images to hero.jpg, facade.jpg, plan.jpg")
    args = ap.parse_args()

    if not args.api_key:
        raise SystemExit("Missing Bing key. Pass --api-key or set BING_SUBSCRIPTION_KEY.")

    # Use your existing data structure
    base_dir = os.path.join(args.data_dir, "images")
    ensure_dir(base_dir)
    
    fmt = args.format or ("csv" if args.metadata.lower().endswith(".csv") else "ndjson")
    
    for prj in read_projects(args.metadata, fmt):
        pid, title, country = prj["project_id"], prj["title"], prj["country"]
        if not pid or not title: 
            print(f"Skipping row with missing project_id/title: {prj}"); continue

        # Create project directory in your existing structure
        project_dir = os.path.join(base_dir, pid)
        ensure_dir(project_dir)

        hero_q, facade_q, plan_q = queries_for(title, country)
        print(f"\n== {pid} :: {title} ==")
        print(" hero  ->", hero_q)
        print(" facade->", facade_q)
        print(" plan  ->", plan_q)

        if args.dry_run: 
            continue

        # Download images directly to project directory
        manifest = {"project_id": pid, "title": title, "images": {}}
        
        # Download multiple candidates for each type
        got_hero   = fetch_slot(args.api_key, hero_q,   project_dir, args.max_per_type)
        got_facade = fetch_slot(args.api_key, facade_q, project_dir, args.max_per_type)
        got_plan   = fetch_slot(args.api_key, plan_q,   project_dir, args.max_per_type, force_line=True)

        # Store metadata
        manifest["images"]["hero"]   = [g["meta"] for g in got_hero]
        manifest["images"]["facade"] = [g["meta"] for g in got_facade]
        manifest["images"]["plan"]   = [g["meta"] for g in got_plan]

        # Optionally rename the best images to standard names
        if args.rename_main and got_hero:
            best_hero = got_hero[0]["path"]
            hero_std = os.path.join(project_dir, "hero.jpg")
            if best_hero != hero_std:
                os.rename(best_hero, hero_std)
                print(f"   Renamed best hero to: hero.jpg")
        
        if args.rename_main and got_facade:
            best_facade = got_facade[0]["path"]
            facade_std = os.path.join(project_dir, "facade.jpg")
            if best_facade != facade_std:
                os.rename(best_facade, facade_std)
                print(f"   Renamed best facade to: facade.jpg")
        
        if args.rename_main and got_plan:
            best_plan = got_plan[0]["path"]
            plan_std = os.path.join(project_dir, "plan.jpg")
            if best_plan != plan_std:
                os.rename(best_plan, plan_std)
                print(f"   Renamed best plan to: plan.jpg")

        # Save manifest for this project
        manifest_path = os.path.join(project_dir, "images_manifest.json")
        save_json(manifest_path, manifest)
        print(f" saved -> {manifest_path}")

if __name__ == "__main__":
    main()