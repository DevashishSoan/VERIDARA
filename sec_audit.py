
import requests
import os

INGEST_URL = "http://localhost:8001/ingest"

def test_zero_byte_file():
    print("Testing 0-byte file upload...")
    fname = "zero.jpg"
    with open(fname, "wb") as f:
        pass
    try:
        with open(fname, 'rb') as f:
            files = {'file': (fname, f, 'image/jpeg')}
            r = requests.post(INGEST_URL, files=files)
            print(f"Result: {r.status_code} - {r.json()}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if os.path.exists(fname): os.remove(fname)

def test_unsupported_type():
    print("\nTesting unsupported file type...")
    fname = "test_sec.txt"
    with open(fname, "w") as f:
        f.write("test")
    try:
        with open(fname, 'rb') as f:
            files = {'file': (fname, f, 'text/plain')}
            r = requests.post(INGEST_URL, files=files)
            print(f"Result: {r.status_code} - {r.json()}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if os.path.exists(fname): os.remove(fname)

def test_large_file_simulation():
    print("\nTesting large file simulation (10MB)...")
    fname = "large_sec.jpg"
    with open(fname, "wb") as f:
        f.write(os.urandom(10 * 1024 * 1024))
    try:
        with open(fname, 'rb') as f:
            files = {'file': (fname, f, 'image/jpeg')}
            r = requests.post(INGEST_URL, files=files)
            print(f"Result: {r.status_code}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if os.path.exists(fname): os.remove(fname)

if __name__ == "__main__":
    test_zero_byte_file()
    test_unsupported_type()
    test_large_file_simulation()
