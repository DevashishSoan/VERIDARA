import pytest
from httpx import AsyncClient, ASGITransport
from main import app
import os
import hashlib

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "ingest-service"}

@pytest.mark.asyncio
async def test_ingest_unsupported_type():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("test.txt", b"hello world", "text/plain")}
        response = await ac.post("/ingest", files=files)
    assert response.status_code == 422
    assert "Unsupported media type" in response.json()["detail"]

@pytest.mark.asyncio
async def test_ingest_jpeg_image():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("test.jpg", b"\xff\xd8\xff", "image/jpeg")}
        response = await ac.post("/ingest", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "received"
    assert "file_hash" in data
    assert "s3_key" in data
    assert data["filename"] == "test.jpg"

@pytest.mark.asyncio
async def test_ingest_png_image():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("test.png", b"\x89PNG\r\n\x1a\n", "image/png")}
        response = await ac.post("/ingest", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "received"
    assert data["filename"] == "test.png"
    assert data["s3_key"].endswith(".png")

@pytest.mark.asyncio
async def test_ingest_mp4_video():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("clip.mp4", b"\x00\x00\x00\x18ftypmp42", "video/mp4")}
        response = await ac.post("/ingest", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "received"
    assert data["s3_key"].endswith(".mp4")

@pytest.mark.asyncio
async def test_ingest_mp3_audio():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("audio.mp3", b"\xff\xfb\x90\x00", "audio/mpeg")}
        response = await ac.post("/ingest", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "received"

@pytest.mark.asyncio
async def test_ingest_no_file():
    """Sending POST without any file should fail."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/ingest")
    assert response.status_code == 422  # FastAPI validation error

@pytest.mark.asyncio
async def test_file_hash_consistency():
    """Two uploads of the same content should produce the same hash."""
    content = b"\xff\xd8\xff\xe0JFIF"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res1 = await ac.post("/ingest", files={"file": ("a.jpg", content, "image/jpeg")})
        res2 = await ac.post("/ingest", files={"file": ("b.jpg", content, "image/jpeg")})
    assert res1.json()["file_hash"] == res2.json()["file_hash"]

    # Verify hash matches direct SHA-256
    expected = hashlib.sha256(content).hexdigest()
    assert res1.json()["file_hash"] == expected

@pytest.mark.asyncio
async def test_unique_job_ids():
    """Each upload should get a unique job_id."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res1 = await ac.post("/ingest", files={"file": ("a.jpg", b"\xff\xd8\xff", "image/jpeg")})
        res2 = await ac.post("/ingest", files={"file": ("b.jpg", b"\xff\xd8\xff", "image/jpeg")})
    assert res1.json()["job_id"] != res2.json()["job_id"]

@pytest.mark.asyncio
async def test_ingest_gif_rejected():
    """GIF should be rejected (not in allowed types)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("test.gif", b"GIF89a", "image/gif")}
        response = await ac.post("/ingest", files=files)
    assert response.status_code == 422
