#!/usr/bin/env python3
"""
Day 8 Ablation Script
Tests different weight presets and measures ranking changes
"""

import csv
import glob
import requests
import os
import json
import time
from typing import List, Dict, Any
from pathlib import Path

# Configuration
URL = "http://127.0.0.1:8000/search/file"
PRESETS = {
    "visual": {"visual": 1.0, "spatial": 0.0, "attr": 0.0},
    "balanced": {"visual": 0.34, "spatial": 0.33, "attr": 0.33},
    "context": {"visual": 0.2, "spatial": 0.4, "attr": 0.4}
}

def post_file(path: str, weights: Dict[str, float], plan_mode: bool = False) -> Dict[str, Any]:
    """Send file to search endpoint with specified weights"""
    with open(path, "rb") as f:
        data = {
            "top_k": 12,
            "w_visual": weights["visual"],
            "w_spatial": weights["spatial"],
            "w_attr": weights["attr"],
            "strict": False
        }
        
        # Add plan mode if spatial weight > 0
        if plan_mode:
            data["mode"] = "plan"
        
        response = requests.post(URL, files={"file": f}, data=data)
        response.raise_for_status()
        return response.json()

def get_project_ids_from_results(results: List[Dict[str, Any]]) -> List[str]:
    """Extract project IDs from search results"""
    return [result.get("project_id", "") for result in results]

def compute_rank_changes(baseline_results: List[Dict[str, Any]], test_results: List[Dict[str, Any]]) -> int:
    """Compute how many ranks changed compared to baseline (visual-only)"""
    baseline_projects = get_project_ids_from_results(baseline_results)
    test_projects = get_project_ids_from_results(test_results)
    
    # Count how many positions changed in top-12
    changes = 0
    for i in range(min(len(baseline_projects), len(test_projects))):
        if baseline_projects[i] != test_projects[i]:
            changes += 1
    
    return changes

def find_test_images() -> List[str]:
    """Find test images for ablation study"""
    # Look for plan images first (they should show spatial effects)
    plan_patterns = [
        "data/images/*/plan.jpg",
        "data/images/*/plan.jpeg",
        "data/images/*/plan.png"
    ]
    
    facade_patterns = [
        "data/images/*/facade.jpg",
        "data/images/*/facade.jpeg",
        "data/images/*/facade.png"
    ]
    
    hero_patterns = [
        "data/images/*/hero.jpg",
        "data/images/*/hero.jpeg",
        "data/images/*/hero.png",
        "data/images/*/hero2.jpg",
        "data/images/*/hero3.jpg",
        "data/images/*/hero4.jpg"
    ]
    
    # Collect images
    test_images = []
    
    # Add plan images (should show spatial effects)
    for pattern in plan_patterns:
        test_images.extend(glob.glob(pattern))
    
    # Add facade images (should show attribute effects)
    for pattern in facade_patterns:
        test_images.extend(glob.glob(pattern))
    
    # Add some hero images for general testing
    for pattern in hero_patterns:
        test_images.extend(glob.glob(pattern))
    
    # Limit to 10 images for reasonable testing time
    return test_images[:10]

def run_ablation_study():
    """Run the ablation study"""
    print("Starting Day 8 Ablation Study...")
    
    # Find test images
    test_images = find_test_images()
    if not test_images:
        print("No test images found!")
        return
    
    print(f"Found {len(test_images)} test images")
    
    # Prepare CSV output
    output_file = "data/metrics/day8_ablation.csv"
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    results = []
    
    for i, image_path in enumerate(test_images):
        print(f"\nProcessing {i+1}/{len(test_images)}: {image_path}")
        
        # Extract query ID from path
        query_id = os.path.basename(os.path.dirname(image_path)) + "_" + os.path.splitext(os.path.basename(image_path))[0]
        
        # Determine if this is a plan image (for plan mode)
        is_plan = "plan" in image_path.lower()
        
        try:
            # Get baseline (visual-only) results
            print("  Getting visual-only baseline...")
            baseline_response = post_file(image_path, PRESETS["visual"], plan_mode=is_plan)
            baseline_results = baseline_response.get("results", [])
            baseline_latency = baseline_response.get("latency_ms", 0)
            
            # Test each preset
            for preset_name, weights in PRESETS.items():
                print(f"  Testing {preset_name} preset...")
                
                # Skip visual preset (already done as baseline)
                if preset_name == "visual":
                    rank_changes = 0
                    top1_project_id = baseline_results[0].get("project_id", "") if baseline_results else ""
                    latency_ms = baseline_latency
                else:
                    # Test the preset
                    response = post_file(image_path, weights, plan_mode=is_plan)
                    test_results = response.get("results", [])
                    latency_ms = response.get("latency_ms", 0)
                    
                    # Compute rank changes vs baseline
                    rank_changes = compute_rank_changes(baseline_results, test_results)
                    top1_project_id = test_results[0].get("project_id", "") if test_results else ""
                
                # Record results
                results.append({
                    "query_id": query_id,
                    "preset": preset_name,
                    "rank_changes": rank_changes,
                    "top1_project_id": top1_project_id,
                    "latency_ms": latency_ms,
                    "is_plan": is_plan
                })
                
                # Small delay to be nice to the server
                time.sleep(0.1)
                
        except Exception as e:
            print(f"  Error processing {image_path}: {e}")
            continue
    
    # Write results to CSV
    print(f"\nWriting results to {output_file}")
    with open(output_file, 'w', newline='') as csvfile:
        fieldnames = ['query_id', 'preset', 'rank_changes', 'top1_project_id', 'latency_ms', 'is_plan']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for result in results:
            writer.writerow(result)
    
    # Print summary
    print(f"\nAblation study complete!")
    print(f"Results written to: {output_file}")
    print(f"Total queries: {len(test_images)}")
    print(f"Total measurements: {len(results)}")
    
    # Show some interesting findings
    print("\nSummary of findings:")
    
    # Count queries with significant changes
    significant_changes = [r for r in results if r["preset"] != "visual" and r["rank_changes"] > 0]
    print(f"Queries with ranking changes: {len(significant_changes)}")
    
    # Show top changes
    top_changes = sorted(significant_changes, key=lambda x: x["rank_changes"], reverse=True)[:5]
    if top_changes:
        print("Top ranking changes:")
        for change in top_changes:
            print(f"  {change['query_id']} ({change['preset']}): {change['rank_changes']} ranks changed")
    
    # Plan vs non-plan analysis
    plan_results = [r for r in results if r["is_plan"]]
    non_plan_results = [r for r in results if not r["is_plan"]]
    
    if plan_results:
        plan_changes = [r for r in plan_results if r["preset"] != "visual" and r["rank_changes"] > 0]
        print(f"Plan images with changes: {len(plan_changes)}/{len(plan_results)//3}")
    
    if non_plan_results:
        non_plan_changes = [r for r in non_plan_results if r["preset"] != "visual" and r["rank_changes"] > 0]
        print(f"Non-plan images with changes: {len(non_plan_changes)}/{len(non_plan_results)//3}")

if __name__ == "__main__":
    run_ablation_study()
