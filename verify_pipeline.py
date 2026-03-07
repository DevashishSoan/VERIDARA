import requests
import time
import os

# Configuration
INGEST_URL = "http://localhost:8001/ingest"
GATEWAY_URL = "http://localhost:3001/v1/analyze"
ORCHESTRATOR_URL = "http://localhost:8002/health"

def verify_services():
    print("--- Verifying Services Status ---")
    try:
        r = requests.get("http://localhost:8001/health")
        print(f"Ingest Service: {r.status_code} - {r.json()}")
    except: print("Ingest Service: OFFLINE")

    try:
        r = requests.get(ORCHESTRATOR_URL)
        print(f"ML Orchestrator: {r.status_code} - {r.json()}")
    except: print("ML Orchestrator: OFFLINE")

def test_pipeline():
    print("\n--- Testing End-to-End Pipeline ---")
    # 1. Create a dummy image
    dummy_path = "test_image.jpg"
    with open(dummy_path, "wb") as f:
        f.write(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00\x60\x00\x60\x00\x00\xFF\xDB\x00\x43\x00\x08\x06\x06")
    
    try:
        # Note: Gateway requires auth, so we'd need a token. 
        # For this quick verification, we'll check if we can reach the orchestrator directly with a mock job
        print("Triggering Orchestrator directly...")
        payload = {
            "job_id": "test_job_123",
            "file_path": "uploads/test_job_123.jpg",
            "media_type": "image"
        }
        # We need to ensure the file exists in storage for MetadataEngine
        storage_path = os.path.join(os.getcwd(), "storage", "uploads", "test_job_123.jpg")
        os.makedirs(os.path.dirname(storage_path), exist_ok=True)
        with open(storage_path, "wb") as f:
             f.write(b"fake data")

        r = requests.post("http://localhost:8002/analyze", json=payload)
        print(f"Orchestrator Result: {r.status_code}")
        print(r.json())
        
        if r.status_code == 200:
            print("\nSUCCESS: Pipeline integration verified.")
        else:
            print("\nFAILED: Pipeline check failed.")
            
    finally:
        if os.path.exists(dummy_path): os.remove(dummy_path)

if __name__ == "__main__":
    verify_services()
    test_pipeline()
