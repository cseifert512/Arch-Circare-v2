import requests
import time

def test_health():
    try:
        print("Testing health endpoint...")
        response = requests.get('http://127.0.0.1:8000/health', timeout=5)
        print(f"Health check: {response.status_code} - {response.json()}")
        return True
    except requests.exceptions.ConnectionError:
        print("Connection failed - server not running")
        return False
    except requests.exceptions.Timeout:
        print("Request timed out - server might be loading")
        return False
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

if __name__ == "__main__":
    print("Simple API test...")
    
    # Test health endpoint
    if test_health():
        print("✅ Server is responding!")
    else:
        print("❌ Server is not responding")
