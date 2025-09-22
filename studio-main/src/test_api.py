# test_api.py - Run this script to test your API setup
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_api_setup():
    service_key = os.getenv("SERVICE_API_KEY")
    api_base = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api")
    branch_id = 1
    
    print("=== API Setup Test ===")
    print(f"SERVICE_API_KEY: {'SET' if service_key else 'NOT SET'}")
    print(f"API_BASE_URL: {api_base}")
    print(f"Testing branch ID: {branch_id}")
    print()
    
    if not service_key:
        print("❌ SERVICE_API_KEY not found in environment!")
        print("Add this to your .env file:")
        print("SERVICE_API_KEY=sk-coffee-shop-api-key-12345")
        return
    
    # Test the endpoint
    url = f"{api_base}/branches/{branch_id}/menu"
    headers = {
        "X-API-Key": service_key,
        "Content-Type": "application/json"
    }
    
    print(f"Testing URL: {url}")
    print(f"Headers: {headers}")
    print()
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Got {len(data)} menu items")
            if data:
                print("Sample item:")
                item = data[0]
                print(f"  ID: {item.get('id')}")
                print(f"  Name: {item.get('name')}")
                print(f"  Price: {item.get('price')}")
                print(f"  Available: {item.get('is_available')}")
        else:
            print(f"❌ Failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - is your FastAPI server running on http://127.0.0.1:8000?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_api_setup()