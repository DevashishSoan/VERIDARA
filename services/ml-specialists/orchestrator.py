from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import sys

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
    
    # 2. Strategy based on media type
    if request.media_type in ["image", "video"]:
        # Run Visual Specialist (Real pixel noise analysis)
        viz_score, viz_findings = visual_expert.analyze(abs_path)
        results["visual"] = viz_score
        
        # Run Metadata Specialist (Real EXIF parsing)
        meta_score, meta_findings = metadata_expert.analyze(abs_path)
        results["metadata"] = meta_score

    elif request.media_type == "audio":
        # Run Audio Specialist (Real spectral flux analysis)
        aud_score, aud_findings = audio_expert.analyze(abs_path)
        results["audio"] = aud_score
        
        # Run Metadata Specialist for ID3/Audio header consistency
        meta_score, meta_findings = metadata_expert.analyze(abs_path)
        results["metadata"] = meta_score

    # 3. Fill missing stubs for aggregator compatibility
    for layer in ["visual", "metadata", "audio", "temporal", "semantic"]:
        if layer not in results:
            # Low-confidence neutral scores for missing layers
            results[layer] = 50

    return {
        "job_id": request.job_id,
        "layers": results,
        "status": "processed"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
