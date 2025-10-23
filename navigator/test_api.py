import requests
import json
import time
import os
from pathlib import Path

TIMEOUT_SECONDS = 15  # fail fast instead of hanging forever
MAX_HEALTH_WAIT_SECONDS = 120
BASE_URL = os.environ.get('API_BASE', 'http://127.0.0.1:8000')
TOKEN = os.environ.get('STUDY_TOKEN')


def _headers(extra: dict | None = None) -> dict:
    h = dict(extra or {})
    if TOKEN:
        h['Authorization'] = f'Bearer {TOKEN}'
    return h


def wait_for_server(url: str | None = None) -> bool:
	"""Poll the health endpoint until it's up or timeout.
	Returns True if healthy within the time limit, else False.
	"""
    url = url or f'{BASE_URL}/healthz'
	deadline = time.time() + MAX_HEALTH_WAIT_SECONDS
	attempt = 0
	while time.time() < deadline:
		attempt += 1
		try:
            resp = requests.get(url, timeout=5)
			if resp.ok:
				print(f"Health check OK on attempt {attempt}: {resp.json()}")
				return True
		except Exception as e:
			print(f"Health attempt {attempt} not ready: {e}")
		time.sleep(2)
	print("Health check timed out.")
	return False


def test_health():
	try:
        response = requests.get(f'{BASE_URL}/healthz', timeout=TIMEOUT_SECONDS)
		print(f"Health check: {response.status_code} - {response.json()}")
		return True
	except Exception as e:
		print(f"Health check failed: {e}")
		return False


def test_search_by_id():
	try:
		body = {"image_id": "i_p_test01_hero", "top_k": 5}
        response = requests.post(f'{BASE_URL}/search/id', json=body, headers=_headers({'Content-Type': 'application/json'}), timeout=TIMEOUT_SECONDS)
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
		img_path = Path('data/images/p_test01/hero.jpg')
		if not img_path.exists():
			print(f"Test image not found at {img_path.resolve()}")
			return False
		with open(img_path, 'rb') as f:
			files = {'file': f}
            response = requests.post(f'{BASE_URL}/search/file?top_k=5', files=files, headers=_headers(), timeout=TIMEOUT_SECONDS)
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
        response = requests.post(f'{BASE_URL}/admin/reload-index', timeout=TIMEOUT_SECONDS)
		print(f"Reload index: {response.status_code} - {response.json()}")
		return True
	except Exception as e:
		print(f"Reload index failed: {e}")
		return False


def test_upload_query_image():
    try:
        img_path = Path('data/images/p_test01/hero.jpg')
        if not img_path.exists():
            print(f"Test image not found at {img_path.resolve()}")
            return False
        with open(img_path, 'rb') as f:
            files = {'file': ('hero.jpg', f, 'image/jpeg')}
            response = requests.post(f'{BASE_URL}/upload/query-image?top_k=5', files=files, headers=_headers(), timeout=TIMEOUT_SECONDS)
        print(f"Upload query-image: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Latency: {data.get('latency_ms')}ms | Results: {len(data.get('results', []))}")
        return True
    except Exception as e:
        print(f"Upload query-image failed: {e}")
        return False


def test_upload_explore():
    try:
        img_path = Path('data/images/p_test01/hero.jpg')
        if not img_path.exists():
            print(f"Test image not found at {img_path.resolve()}")
            return False
        with open(img_path, 'rb') as f:
            files = {'file': ('hero.jpg', f, 'image/jpeg')}
            response = requests.post(f'{BASE_URL}/upload/explore?top_k=5', files=files, headers=_headers(), timeout=TIMEOUT_SECONDS)
        print(f"Upload explore: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Latency: {data.get('latency_ms')}ms | Results: {len(data.get('results', []))}")
        return True
    except Exception as e:
        print(f"Upload explore failed: {e}")
        return False


if __name__ == "__main__":
	print("Testing API endpoints...")

	# Ensure we're run from the navigator directory so relative paths resolve
	cwd = Path.cwd()
	expected = Path(__file__).resolve().parent
	if cwd != expected:
		print(f"Warning: Running from {cwd}, expected {expected}. Changing directory.")
		os.chdir(expected)

	# Wait for server to be ready instead of blind sleep
    if not wait_for_server():
		print("Server not responding. Please make sure the server is running.")
		raise SystemExit(1)

    # Test health
    if test_health():
        # Test search by ID (non-fatal if it fails)
        test_search_by_id()

        # Test search by file
        test_search_by_file()

        # Test upload endpoints
        test_upload_query_image()
        test_upload_explore()

        # Test reload index
        test_reload_index()
