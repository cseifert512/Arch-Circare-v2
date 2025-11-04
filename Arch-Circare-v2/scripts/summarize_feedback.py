#!/usr/bin/env python3

import json
import statistics
from collections import defaultdict
from pathlib import Path

def summarize_feedback():
    """Summarize feedback data from JSONL logs"""
    log_file = Path("navigator/data/logs/feedback.jsonl")
    
    if not log_file.exists():
        print("❌ Feedback log file not found")
        return
    
    events = []
    sessions = set()
    
    # Read and parse all feedback events
    with open(log_file, 'r') as f:
        for line in f:
            try:
                event = json.loads(line.strip())
                events.append(event)
                sessions.add(event['session_id'])
            except json.JSONDecodeError as e:
                print(f"⚠️ Skipping malformed line: {e}")
                continue
    
    if not events:
        print("❌ No feedback events found")
        return
    
    print("=== Feedback Analytics Summary ===")
    print(f"sessions: {len(sessions)}")
    print(f"events: {len(events)}")
    
    # Calculate weight deltas
    weight_deltas = {
        'visual': [],
        'spatial': [],
        'attr': []
    }
    
    likes_per_event = []
    
    for event in events:
        weights_before = event.get('weights_before', {})
        weights_after = event.get('weights_after', {})
        
        # Calculate deltas for each weight
        for weight_type in ['visual', 'spatial', 'attr']:
            before = weights_before.get(weight_type, 0)
            after = weights_after.get(weight_type, 0)
            delta = after - before
            weight_deltas[weight_type].append(delta)
        
        # Count likes per event
        liked_count = len(event.get('liked', []))
        likes_per_event.append(liked_count)
    
    # Calculate average deltas
    avg_deltas = {}
    for weight_type, deltas in weight_deltas.items():
        if deltas:
            avg_delta = statistics.mean(deltas)
            avg_deltas[weight_type] = avg_delta
    
    print(f"avg nudge: visual {avg_deltas.get('visual', 0):+.2f}, spatial {avg_deltas.get('spatial', 0):+.2f}, attr {avg_deltas.get('attr', 0):+.2f}")
    
    # Calculate median likes per event
    if likes_per_event:
        median_likes = statistics.median(likes_per_event)
        print(f"median liked per event: {median_likes}")
    
    # Session-specific analysis
    print(f"\n=== Session Analysis ===")
    session_stats = defaultdict(lambda: {'events': 0, 'total_likes': 0, 'total_dislikes': 0})
    
    for event in events:
        session_id = event['session_id']
        session_stats[session_id]['events'] += 1
        session_stats[session_id]['total_likes'] += len(event.get('liked', []))
        session_stats[session_id]['total_dislikes'] += len(event.get('disliked', []))
    
    for session_id, stats in session_stats.items():
        print(f"Session {session_id}: {stats['events']} events, {stats['total_likes']} likes, {stats['total_dislikes']} dislikes")
    
    # Weight change analysis
    print(f"\n=== Weight Change Analysis ===")
    significant_changes = 0
    for event in events:
        weights_before = event.get('weights_before', {})
        weights_after = event.get('weights_after', {})
        
        # Check if any weight changed by more than 0.01
        for weight_type in ['visual', 'spatial', 'attr']:
            before = weights_before.get(weight_type, 0)
            after = weights_after.get(weight_type, 0)
            if abs(after - before) > 0.01:
                significant_changes += 1
                break
    
    print(f"Events with significant weight changes: {significant_changes}/{len(events)} ({significant_changes/len(events)*100:.1f}%)")
    
    # Recent activity
    print(f"\n=== Recent Activity ===")
    recent_events = sorted(events, key=lambda x: x.get('ts', ''), reverse=True)[:5]
    for event in recent_events:
        ts = event.get('ts', 'unknown')
        session = event.get('session_id', 'unknown')
        likes = len(event.get('liked', []))
        dislikes = len(event.get('disliked', []))
        print(f"  {ts}: Session {session} - {likes} likes, {dislikes} dislikes")

if __name__ == "__main__":
    summarize_feedback()
