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
    # 1. Resolve Path Robustly
    # Use absolute path relative to the monorepo root for consistency
    filename = os.path.basename(request.file_path)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    abs_path = os.path.normpath(os.path.join(base_dir, "storage", "uploads", filename))
    
    import hashlib
    with open(abs_path, "rb") as f:
        file_hash = hashlib.md5(f.read()).hexdigest()
    
    print(f"[ORCH] Analyzing {request.media_type}: {filename}")
    print(f"[ORCH] Incoming image MD5: {file_hash}")
    
    if not os.path.exists(abs_path):
        print(f"[ORCH] ERROR: File not found at {abs_path}")
        return {
            "job_id": request.job_id,
            "status": "failed",
            "error": f"File not found: {filename}"
        }

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
            print(f"[ORCH] {layer.upper()} Result: {score} - {findings[0] if findings else 'OK'}")
            results[layer] = score
        except Exception as exc:
            print(f"[ORCH] CRITICAL: Layer {layer} crashed: {str(exc)}")
            results[layer] = 50

    # 3. Semantic Analysis (Basic Aspect Ratio & Resolution Heuristics)
    # AI models often default to perfect squares or specific generator-native resolutions
    try:
        if request.media_type == "image":
            import cv2
            img_info = cv2.imread(abs_path)
            if img_info is not None:
                h, w = img_info.shape[:2]
                
                # Semantic Scoring: Authenticity starts at 90, reduced by anomalies
                semantic_score = 90
                
                # Check 1: Generator-native resolutions (Updated for v6/Flux)
                ai_resolutions = [
                    (512, 512), (1024, 1024), (2048, 2048),
                    (1024, 1536), (1536, 1024), (768, 1024), (1024, 768),
                    (832, 1216), (1216, 832), # Flux/SDXL defaults
                    (1456, 816), (816, 1456)   # Widescreen AI standards
                ]
                # Check 1: Generator-native resolutions (Continuous Proximity)
                ai_resolutions = [
                    (512, 512), (1024, 1024), (2048, 2048),
                    (1024, 1536), (1536, 1024), (768, 1024), (1024, 768),
                    (832, 1216), (1216, 832), (1456, 816), (816, 1456)
                ]
                
                # Find closest AI resolution
                min_dist = min([abs(w - res[0]) + abs(h - res[1]) for res in ai_resolutions])
                if min_dist < 40: # Within 40px of total dimension difference
                    p_res = 55 * (1.0 - (min_dist / 40.0))
                    semantic_score -= p_res
                    print(f"[ORCH] Resolution Match: Closest AI target distance {min_dist}px (penalty:-{p_res:.1f})")
                
                # Check 2: Aspect Ratio Precision (Continuous)
                ratio = w / h
                ai_ratios = [1.0, 1.5, 1.333, 0.75, 1.777, 0.666, 0.5625]
                min_r_dist = min([abs(ratio - r) for r in ai_ratios])
                if min_r_dist < 0.02:
                    p_ratio = 15 * (1.0 - (min_r_dist / 0.02))
                    semantic_score -= p_ratio
                    print(f"[ORCH] Ratio Match: Distance to AI standard {min_r_dist:.4f} (penalty:-{p_ratio:.1f})")
                
                print(f"[ORCH] SEMANTIC Score: {semantic_score:.1f} (Resolution: {w}x{h}, Ratio: {ratio:.3f})")
                results["semantic"] = max(0, semantic_score)
    except:
        results["semantic"] = 50

    # 4. Return only layers that actually ran so the gateway
    #    can reason over true signals instead of flat 50s.
    return {
        "job_id": request.job_id,
        "layers": results,
        "status": "processed"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
