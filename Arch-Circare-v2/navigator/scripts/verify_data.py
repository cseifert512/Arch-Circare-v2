import sys
from pathlib import Path
import pandas as pd
import argparse

def main(images_dir: str, plans_dir: str, metadata_file: str):
    """Verify data integrity and file consistency."""
    images_p = Path(images_dir)
    plans_p = Path(plans_dir)
    meta_p = Path(metadata_file)
    
    print(f"[verify] Checking images: {images_p}")
    print(f"[verify] Checking plans: {plans_p}")
    print(f"[verify] Checking metadata: {meta_p}")
    
    # Check if metadata file exists
    if not meta_p.exists():
        print(f"[verify] ERROR: Metadata file not found: {meta_p}")
        sys.exit(1)
    
    # Load metadata
    try:
        csv = pd.read_csv(meta_p)
        print(f"[verify] Loaded metadata with {len(csv)} projects")
    except Exception as e:
        print(f"[verify] ERROR: Failed to read metadata: {e}")
        sys.exit(1)
    
    # Check required columns
    required_columns = ['project_id', 'title', 'country', 'climate_bin', 'typology', 'massing_type', 'wwr_band', 'image_ids']
    missing_columns = [col for col in required_columns if col not in csv.columns]
    if missing_columns:
        print(f"[verify] ERROR: Missing required columns: {missing_columns}")
        sys.exit(1)
    
    # Validate categorical values
    valid_climates = {'hot-humid', 'hot-arid', 'temperate', 'cold'}
    valid_massing = {'bar', 'slab', 'perimeter_block', 'tower', 'courtyard'}
    valid_wwr = {'low', 'medium', 'high'}
    
    invalid_climates = set(csv['climate_bin'].dropna()) - valid_climates
    invalid_massing = set(csv['massing_type'].dropna()) - valid_massing
    invalid_wwr = set(csv['wwr_band'].dropna()) - valid_wwr
    
    if invalid_climates:
        print(f"[verify] ERROR: Invalid climate_bin values: {invalid_climates}")
        sys.exit(1)
    if invalid_massing:
        print(f"[verify] ERROR: Invalid massing_type values: {invalid_massing}")
        sys.exit(1)
    if invalid_wwr:
        print(f"[verify] ERROR: Invalid wwr_band values: {invalid_wwr}")
        sys.exit(1)
    
    # Check image files
    missing_images = []
    missing_plans = []
    
    for _, row in csv.iterrows():
        project_id = row['project_id']
        
        # Check images
        if pd.notna(row['image_ids']):
            for img_id in str(row['image_ids']).split('|'):
                img_id = img_id.strip()
                if not img_id:
                    continue
                    
                # Look for image file in project directory
                project_dir = images_p / project_id
                if not project_dir.exists():
                    missing_images.append(f"{img_id} (project dir missing: {project_dir})")
                    continue
                
                # Check for any file starting with img_id
                found = False
                for ext in ['*.jpg', '*.jpeg', '*.png']:
                    for img_file in project_dir.glob(ext):
                        if img_file.stem.startswith(img_id):
                            found = True
                            break
                    if found:
                        break
                
                if not found:
                    missing_images.append(img_id)
        
        # Check plans
        if pd.notna(row.get('plan_ids', '')):
            for plan_id in str(row['plan_ids']).split('|'):
                plan_id = plan_id.strip()
                if not plan_id:
                    continue
                    
                # Look for plan file in project directory
                project_dir = plans_p / project_id
                if not project_dir.exists():
                    missing_plans.append(f"{plan_id} (project dir missing: {project_dir})")
                    continue
                
                # Check for any file starting with plan_id
                found = False
                for ext in ['*.png', '*.jpg', '*.jpeg']:
                    for plan_file in project_dir.glob(ext):
                        if plan_file.stem.startswith(plan_id):
                            found = True
                            break
                    if found:
                        break
                
                if not found:
                    missing_plans.append(plan_id)
    
    # Report results
    if missing_images:
        print(f"[verify] ERROR: Missing {len(missing_images)} image files. Examples: {missing_images[:5]}")
        sys.exit(1)
    
    if missing_plans:
        print(f"[verify] WARNING: Missing {len(missing_plans)} plan files. Examples: {missing_plans[:5]}")
        # Plans are optional, so this is just a warning
    
    print("[verify] Data verification: OK")
    print(f"[verify] Found {len(csv)} projects with valid metadata and image files")

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description="Verify data integrity")
    ap.add_argument('--images', required=True, help='Path to images directory')
    ap.add_argument('--plans', required=True, help='Path to plans directory')
    ap.add_argument('--metadata', required=True, help='Path to metadata CSV file')
    args = ap.parse_args()
    main(args.images, args.plans, args.metadata)
