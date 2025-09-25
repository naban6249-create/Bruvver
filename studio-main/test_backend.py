import requests
import sys

try:
    response = requests.get('http://127.0.0.1:8000/health', timeout=5)
    print(f"Backend health check: Status {response.status_code}")
    print(f"Response: {response.text}")
except requests.exceptions.ConnectionError:
    print("Backend server is not running on port 8000")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
