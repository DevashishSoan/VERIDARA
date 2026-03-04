import pytest
import os
import cv2
import numpy as np
import tempfile
import librosa
import soundfile as sf
from visual_specialist import VisualSpecialist
from audio_specialist import AudioSpecialist
from metadata_engine import MetadataForensics

# ─── Visual Specialist Unit Tests ───────────────────────────────────

def test_visual_mfna_synthetic_pattern():
    """AI often has 'perfect' gradients. We test against a flat image (std=0)."""
    specialist = VisualSpecialist()
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        # Create a perfectly flat image (synthetic)
        img = np.zeros((100, 100), dtype=np.uint8)
        cv2.imwrite(f.name, img)
        tmp_path = f.name
    try:
        score, findings = specialist.analyze(tmp_path)
        # Flat image should have std=0, so score should be low (~40)
        assert score < 50
        assert any("CRITICAL" in f or "Extreme pixel uniformity" in f for f in findings)
    finally:
        os.unlink(tmp_path)

def test_visual_mfna_natural_noise():
    """Natural noise should have a higher std dev than AI."""
    specialist = VisualSpecialist()
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        # Create an image with significant Gaussian noise
        img = np.random.normal(128, 5, (100, 100)).astype(np.uint8)
        cv2.imwrite(f.name, img)
        tmp_path = f.name
    try:
        score, findings = specialist.analyze(tmp_path)
        # Noisy natural-looking image should score highly
        assert score >= 70
        assert any("Authentic grain detected" in f for f in findings)
    finally:
        os.unlink(tmp_path)

# ─── Audio Specialist Unit Tests ────────────────────────────────────

def test_audio_spectral_flux_synthetic():
    """Synthesized audio often has perfectly repetitive frequencies (low flux)."""
    specialist = AudioSpecialist()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        # Create a perfectly harmonic tone (sum of sines)
        # Synthetic voices often have very 'clean' harmonics.
        sr = 22050
        duration = 1.0
        t = np.linspace(0, duration, int(sr * duration))
        y = np.sin(2 * np.pi * 440 * t) + 0.5 * np.sin(2 * np.pi * 880 * t) + 0.2 * np.sin(2 * np.pi * 1760 * t)
        sf.write(f.name, y, sr)
        tmp_path = f.name
    try:
        score, findings = specialist.analyze(tmp_path)
        print(f"\nDEBUG: Synthetic Tone Score: {score}, Findings: {findings}")
        # Purely harmonic synthetic tone should score low on flatness/flux
        assert score < 60
        assert any("Unnatural spectral tonality" in f or "Low frequency jitter" in f for f in findings)
    finally:
        os.unlink(tmp_path)

def test_audio_natural_speech_variance():
    """White noise has high spectral flux."""
    specialist = AudioSpecialist()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        sr = 22050
        y = np.random.uniform(-1, 1, sr) # White noise (high variance)
        sf.write(f.name, y, sr)
        tmp_path = f.name
    try:
        score, findings = specialist.analyze(tmp_path)
        print(f"DEBUG: Natural Flux Score: {score}, Findings: {findings}")
        assert score >= 60
        assert any("jitter" in f or "Natural spectral variance" in f for f in findings)
    finally:
        os.unlink(tmp_path)

# ─── Metadata Engine Unit Tests ─────────────────────────────────────

def test_metadata_real_exif():
    """Check that we actually read AI markers (DALL-E etc)."""
    engine = MetadataForensics()
    # We can mock the EXIF data if needed, but here we just check markers list
    assert "DALL-E" in engine.ai_markers
    assert "Midjourney" in engine.ai_markers
