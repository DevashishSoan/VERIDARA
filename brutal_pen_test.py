
import requests
import time
import os
import concurrent.futures

BASE_URL = "http://localhost:3001"

def print_result(title, r):
    status = r.status_code
    try:
        body = r.json()
    except:
        body = r.text[:100]
    print(f"[ {title} ] Status: {status} | Body: {body}")

def test_unauthorized():
    print("\n--- 1. Unauthorized Access Test ---")
    r = requests.get(f"{BASE_URL}/v1/history")
    print_result("History (No Token)", r)
    
    r = requests.get(f"{BASE_URL}/v1/jobs/123", headers={"Authorization": "Bearer junk_token"})
    print_result("Job Status (Junk Token)", r)

def test_payload_bomb():
    print("\n--- 2. JSON Payload Bomb Test ---")
    # Sending a large nested JSON to test parser limits
    bomb = {"data": {"nested": ["a" * 1000] * 1000}}
    try:
        r = requests.post(f"{BASE_URL}/v1/analyze", json=bomb)
        print_result("Analyze (Large JSON)", r)
    except Exception as e:
        print(f"Payload Bomb Error: {e}")

def test_path_traversal():
    print("\n--- 3. Path Traversal Test ---")
    traversals = ["../../etc/passwd", "..%2f..%2fconfig.js", "C:\\Windows\\System32\\drivers\\etc\\hosts"]
    for path in traversals:
        # Check jobs endpoint which uses :id param
        r = requests.get(f"{BASE_URL}/v1/jobs/{path}")
        print_result(f"Traversal [{path}]", r)

def test_dos_rapid_fire():
    print("\n--- 4. Rapid Fire (Rate Limiting) Test ---")
    def hit_endpoint():
        try:
            return requests.get(f"{BASE_URL}/health").status_code
        except:
            return 500

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(hit_endpoint) for _ in range(150)]
        results = [f.result() for f in futures]
    
    status_counts = {}
    for s in results:
        status_counts[s] = status_counts.get(s, 0) + 1
    print(f"Results of 150 rapid requests: {status_counts}")

if __name__ == "__main__":
    print("=== STARTING BRUTAL PEN TEST ===")
    test_unauthorized()
    test_path_traversal()
    test_payload_bomb()
    test_dos_rapid_fire()
    print("\n=== PEN TEST COMPLETE ===")
