import os
import shutil
import hashlib
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import time
import uuid

app = FastAPI(title="VERIDARA Ingest Service")

# Configuration
UPLOAD_DIR = "../../storage/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class AnalysisJob(BaseModel):
    id: str
    status: str
    created_at: float

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ingest-service"}

@app.post("/ingest")
async def ingest_media(file: UploadFile = File(...)):
    # 1. Validate file type
    allowed_types = ["image/jpeg", "image/png", "video/mp4", "audio/mpeg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=422, detail="Unsupported media type")
    
    # 1.1 Reject 0-byte files
    if file.size == 0:
        raise HTTPException(status_code=422, detail="Empty file payload")
    
    # 2. Generate unique job ID and filename
    job_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    save_path = os.path.join(UPLOAD_DIR, f"{job_id}{file_ext}")
    
    # 3. Save file locally
    hasher = hashlib.sha256()
    try:
        with open(save_path, "wb") as buffer:
            # Read in chunks to handle large files
            while True:
                chunk = await file.read(1024 * 1024) # 1MB chunks
                if not chunk:
                    break
                hasher.update(chunk)
                buffer.write(chunk)
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=500, detail=str(e))
    
    file_hash = hasher.hexdigest()
    
    # In production: Create DB entry in PostgreSQL here
    # result = db.query("INSERT INTO analysis_jobs ...")
    
    return {
        "job_id": job_id,
        "filename": file.filename,
        "s3_key": f"uploads/{job_id}{file_ext}", # Key for future S3 migration
        "file_hash": file_hash,
        "status": "received",
        "timestamp": time.time()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
