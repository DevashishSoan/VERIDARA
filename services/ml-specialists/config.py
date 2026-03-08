import os

# --- Visual Specialist Thresholds ---
FLAT_RATIO_THRESHOLD = 0.12        # Ratio of "perfectly flat" tiles to trigger suspicion
TEXTURE_VAR_THRESHOLD = 2.0        # Coefficient of variation for noise inconsistency
ELA_VAL_THRESHOLD = 0.5            # Mean difference in Error Level Analysis
SCAN_EDGE_DENSITY_REQ = 0.05       # Minimum edge density to qualify as a "document scan"
SCAN_STD_DEV_LIMIT = 3.0           # Maximum valid noise for a clean scan
AUTHENTIC_STD_DEV_MIN = 3.5        # Minimum noise to earn "Authentic Grain" boost

# --- Audio Specialist Thresholds ---
SPECTRAL_FLATNESS_THRESHOLD = 0.0001
SPECTRAL_FLUX_THRESHOLD = 0.5
ZCR_THRESHOLD = 0.5                # Zero Crossing Rate for artifacts

# --- Metadata Engine Config ---
AI_MARKER_PENALTY = 90
MANIPULATION_PENALTY = 45
MISSING_EXIF_PENALTY = 15

# --- Aggregator Logic (Backend) ---
# Note: These values are synced with the Node.js aggregator service
IMAGE_WEIGHTS = {
    "visual": 0.70,
    "metadata": 0.10,
    "semantic": 0.20
}

AUDIO_WEIGHTS = {
    "audio": 0.85,
    "metadata": 0.15
}
