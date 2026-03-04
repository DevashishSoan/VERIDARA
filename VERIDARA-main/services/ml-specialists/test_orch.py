import pytest
from httpx import AsyncClient, ASGITransport
from orchestrator import app
from visual_specialist import VisualSpecialist
from metadata_engine import MetadataForensics
from audio_specialist import AudioSpecialist
import os
import tempfile

# ─── Orchestrator API Tests ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert "visual" in response.json()["specialists"]
    assert "metadata" in response.json()["specialists"]

@pytest.mark.asyncio
async def test_analyze_image():
    payload = {
        "job_id": "test_job_img",
        "file_path": "uploads/test.jpg",
        "media_type": "image"
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "test_job_img"
    assert "visual" in data["layers"]
    assert "metadata" in data["layers"]
    assert data["status"] == "processed"

@pytest.mark.asyncio
async def test_analyze_video():
    payload = {
        "job_id": "test_job_vid",
        "file_path": "uploads/clip.mp4",
        "media_type": "video"
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "test_job_vid"
    # Video should still trigger visual and metadata analysis
    assert "visual" in data["layers"]
    assert "metadata" in data["layers"]

@pytest.mark.asyncio
async def test_analyze_audio_type():
    """Audio type should still return placeholder scores."""
    payload = {
        "job_id": "test_job_aud",
        "file_path": "uploads/audio.mp3",
        "media_type": "audio"
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Audio type doesn't trigger visual/metadata in current logic
    assert "temporal" in data["layers"]
    assert "audio" in data["layers"]
    assert "semantic" in data["layers"]

@pytest.mark.asyncio
async def test_analyze_has_all_layers():
    """All 5 forensic layers should always be present."""
    payload = {
        "job_id": "test_layers",
        "file_path": "uploads/test.jpg",
        "media_type": "image"
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/analyze", json=payload)
    layers = response.json()["layers"]
    required = ["visual", "metadata", "temporal", "audio", "semantic"]
    for layer in required:
        assert layer in layers, f"Missing layer: {layer}"

@pytest.mark.asyncio
async def test_analyze_missing_fields():
    """Missing required fields should return 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/analyze", json={"job_id": "only_id"})
    assert response.status_code == 422

# ─── Unit Tests: Visual Specialist ───────────────────────────────────

def test_visual_specialist():
    specialist = VisualSpecialist()
    score, findings = specialist.analyze(None)
    assert isinstance(score, int)
    assert 0 <= score <= 100
    assert isinstance(findings, list)
    assert len(findings) > 0

def test_visual_specialist_name():
    specialist = VisualSpecialist()
    assert specialist.name == "Visual Forensics Specialist"

# ─── Unit Tests: Metadata Engine ─────────────────────────────────────

def test_metadata_missing_file():
    engine = MetadataForensics()
    score, findings = engine.analyze("/nonexistent/path.jpg")
    assert score == 0
    assert "File not found" in findings

def test_metadata_real_file():
    """Create a temp file and analyze it."""
    engine = MetadataForensics()
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        f.write(b"\xff\xd8\xff\xe0\x00\x10JFIF")  # Minimal JPEG header
        tmp_path = f.name
    try:
        score, findings = engine.analyze(tmp_path)
        assert isinstance(score, int)
        assert 0 <= score <= 100
        assert isinstance(findings, list)
    finally:
        os.unlink(tmp_path)

def test_metadata_ai_markers():
    """Verify that AI marker list is properly defined."""
    engine = MetadataForensics()
    assert "DALL-E" in engine.ai_markers
    assert "Midjourney" in engine.ai_markers
    assert "Stable Diffusion" in engine.ai_markers

# ─── Unit Tests: Audio Specialist ────────────────────────────────────

def test_audio_specialist():
    specialist = AudioSpecialist()
    score, findings = specialist.analyze(None)
    assert isinstance(score, int)
    assert 0 <= score <= 100
    assert isinstance(findings, list)

def test_audio_specialist_name():
    specialist = AudioSpecialist()
    assert specialist.name == "Audio Forensics Specialist"
