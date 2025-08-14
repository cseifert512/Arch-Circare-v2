import requests
import json
import time

def test_health():
    try:
        response = requests.get('http://127.0.0.1:8000/health')
        print(f"Health check: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_search_by_id():
    try:
        body = {"image_id": "i_p_test01_hero", "top_k": 5}
        response = requests.post('http://127.0.0.1:8000/search/id', json=body)
        print(f"Search by ID: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Latency: {data.get('latency_ms')}ms")
            print(f"Results: {len(data.get('results', []))}")
            for result in data.get('results', [])[:3]:
                print(f"  - {result.get('project_id')}: {result.get('title')} ({result.get('typology')})")
        return True
    except Exception as e:
        print(f"Search by ID failed: {e}")
        return False

def test_search_by_file():
    try:
        with open('data/images/p_test01/hero.jpg', 'rb') as f:
            files = {'file': f}
            response = requests.post('http://127.0.0.1:8000/search/file?top_k=5', files=files)
        print(f"Search by file: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Latency: {data.get('latency_ms')}ms")
            print(f"Results: {len(data.get('results', []))}")
        return True
    except Exception as e:
        print(f"Search by file failed: {e}")
        return False

def test_reload_index():
    try:
        response = requests.post('http://127.0.0.1:8000/admin/reload-index')
        print(f"Reload index: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"Reload index failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing API endpoints...")
    
    # Wait for server to be ready
    time.sleep(2)
    
    # Test health
    if test_health():
        # Test search by ID
        test_search_by_id()
        
        # Test search by file
        test_search_by_file()
        
        # Test reload index
        test_reload_index()
    else:
        print("Server not responding. Please make sure the server is running.")
