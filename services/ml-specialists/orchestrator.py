from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import sys
import concurrent.futures

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from visual_specialist import VisualSpecialist
from metadata_engine import MetadataForensics
from audio_specialist import AudioSpecialist

app = FastAPI(title="VERIDARA ML Orchestrator")

# Initialize specialists
visual_expert = VisualSpecialist()
metadata_expert = MetadataForensics()
audio_expert = AudioSpecialist()

# Shared thread pool for specialists (OpenCV/NumPy release the GIL)
executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

class AnalysisRequest(BaseModel):
    job_id: str
    file_path: str
    media_type: str

@app.get("/health")
def health():
    return {"status": "ready", "specialists": ["visual", "metadata", "audio"]}

@app.post("/analyze")
async def analyze_media(request: AnalysisRequest):
    results = {}
    
    # 1. Resolve Path
    abs_path = os.path.join(os.path.dirname(__file__), "../../storage/uploads", os.path.basename(request.file_path))
    
    # 2. Strategy based on media type - Execute in parallel
    future_to_layer = {}
    
    if request.media_type in ["image", "video"]:
        # Run Visual Specialist
        future_to_layer[executor.submit(visual_expert.analyze, abs_path)] = "visual"
        # Run Metadata Specialist
        future_to_layer[executor.submit(metadata_expert.analyze, abs_path)] = "metadata"

    elif request.media_type == "audio":
        # Run Audio Specialist
        future_to_layer[executor.submit(audio_expert.analyze, abs_path)] = "audio"
        # Run Metadata Specialist
        future_to_layer[executor.submit(metadata_expert.analyze, abs_path)] = "metadata"

    # Wait for all specialists to finish
    for future in concurrent.futures.as_completed(future_to_layer):
        layer = future_to_layer[future]
        try:
            score, findings = future.result()
            results[layer] = score
        except Exception as exc:
            print(f"Layer {layer} generated an exception: {exc}")
            results[layer] = 50

    # 3. Fill missing stubs for aggregator compatibility
    for layer in ["visual", "metadata", "audio", "temporal", "semantic"]:
        if layer not in results:
            results[layer] = 50

    return {
        "job_id": request.job_id,
        "layers": results,
        "status": "processed"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
