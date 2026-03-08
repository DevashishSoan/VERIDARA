import cv2
import numpy as np
import os
from config import (
    FLAT_RATIO_THRESHOLD, TEXTURE_VAR_THRESHOLD, ELA_VAL_THRESHOLD,
    SCAN_EDGE_DENSITY_REQ, SCAN_STD_DEV_LIMIT, AUTHENTIC_STD_DEV_MIN
)

class VisualSpecialist:
    def __init__(self):
        self.name = "Visual Forensics Specialist"

    def analyze(self, image_path):
        """
        Real Forensic Analysis: Median Filter Noise Analysis (MFNA).
        Authentic images have natural sensor noise. AI-generated images have 'perfect' 
        pixels that show anomalous residuals when filtered.
        """
        if not image_path or not os.path.exists(image_path):
            return 50, ["Visual analysis skipped: File not accessible"]

        try:
            # 1. Robust Loading
            img_bytes = np.fromfile(image_path, dtype=np.uint8)
            img_bgr = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)
            
            if img_bgr is None: return 50, ["Format error: Unable to decode image bitstream"]

            # Baseline Shift: We start at 50 (Skeptical Baseline - Inconclusive)
            # Authenticity must be PROVEN through sensor noise or verified document context.
            score = 50
            findings = []

            # Convert to gray for main analysis
            img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            
            # Vibrancy Check: Real documents are rarely saturated. Vibrant AI photos shouldn't get scan boosts.
            hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
            avg_saturation = np.mean(hsv[:,:,1])
            is_vibrant = avg_saturation > 40 # Threshold for "not a boring scan"


            # Speed up: Resize if huge
            h, w = img.shape[:2]
            if max(h, w) > 1024:
                scale = 1024 / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

            # 2. Error Level Analysis (ELA) Simulation
            _, encoded_img = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            ela_img = cv2.imdecode(encoded_img, cv2.IMREAD_GRAYSCALE)
            ela_diff = cv2.absdiff(img, ela_img)
            ela_val = np.mean(ela_diff)

            # 3. Document/Scan Detection (Calibration for False Positives)
            # Real documents have high local contrast (text/graphics) but low global noise (if scanned).
            edges = cv2.Canny(img, 100, 200)
            edge_density = np.sum(edges) / (h * w * 255)
            
            # 4. Enhanced Noise Statistics (MFNA)
            denoised = cv2.medianBlur(img, 3)
            noise_residual = cv2.absdiff(img, denoised)
            std_dev = np.std(noise_residual)
            
            # 5. Deep Texture Audit (Block-based Analysis)
            # AI often has "patchy" noise: perfect in some areas, noisy in others.
            block_size = 32
            blocks_h = h // block_size
            blocks_w = w // block_size
            
            local_stds = []
            flat_blocks = 0
            
            for i in range(blocks_h):
                for j in range(blocks_w):
                    block = noise_residual[i*block_size:(i+1)*block_size, j*block_size:(j+1)*block_size]
                    block_std = np.std(block)
                    local_stds.append(block_std)
                    if block_std < 0.8: # Extremely flat texture tile
                        flat_blocks += 1
            
            total_blocks = blocks_h * blocks_w
            flat_ratio = flat_blocks / total_blocks if total_blocks > 0 else 0
            texture_inconsistency = np.std(local_stds) if local_stds else 0
            
            # Calibration: If it's high contrast but low noise AND low vibrancy, it's likely a real document.
            # If it's vibrant (vivid colors), we disable the scan boost to catch complex AI scenes.
            is_potential_scan = edge_density > SCAN_EDGE_DENSITY_REQ and std_dev < SCAN_STD_DEV_LIMIT and not is_vibrant

            # Scoring based on Texture Audit (Harsher for v2.3)
            if flat_ratio > FLAT_RATIO_THRESHOLD:
                score -= 45
                findings.append(f"Texture Audit: Block-level perfection detected (ratio:{flat_ratio:.2f}).")
            
            if texture_inconsistency > TEXTURE_VAR_THRESHOLD:
                score -= 20
                findings.append(f"Inconsistent Grain: Patchy texture variance (var:{texture_inconsistency:.2f}).")

            if ela_val < ELA_VAL_THRESHOLD:
                if not is_potential_scan:
                    score -= 35
                    findings.append(f"Forensic Anomaly: Flat compression grid (val:{ela_val:.2f}).")
                else:
                    score -= 10
                    findings.append(f"Scan Profile: Low ELA response (val:{ela_val:.2f}).")
            
            # Stricter Noise Bounds with Skeptical Growth
            if std_dev < 1.0:
                score -= 40
                findings.append(f"AI Signature: Zero-noise surface (std:{std_dev:.2f}).")
            elif std_dev < SCAN_STD_DEV_LIMIT:
                if not is_potential_scan:
                    score -= 15
                    findings.append(f"Suspicious: Low sensor noise (std:{std_dev:.2f}).")
                else:
                    score += 15 # Scan tolerance boost (now harder to earn)
                    findings.append(f"Scan Verification: Low noise (std:{std_dev:.2f}) matches document scan profile.")
            elif std_dev > AUTHENTIC_STD_DEV_MIN:
                score += 35 # Natural sensor noise 'earns' high trust
                findings.append(f"Authentic Grain: Natural pixel variance detected (std:{std_dev:.2f}).")

            # Final Calibration: High edge density earns a boost ONLY if low vibrancy verified
            if is_potential_scan:
                score += 20
                findings.append("Document Identity: Validated low-vibrancy high-structure content.")
            elif is_vibrant and edge_density > 0.05:
                findings.append("Vibrancy Audit: High-vibrancy detected. Scan tolerance disabled for saturated scene.")

            # 5. Spectral Frequency Audit (FFT)
            f_transform = np.fft.fft2(img)
            f_shift = np.fft.fftshift(f_transform)
            magnitude_spectrum = 20 * np.log(np.abs(f_shift) + 1)
            
            spectral_peak = np.max(magnitude_spectrum)
            if spectral_peak > 235:
                score -= 20
                findings.append(f"Spectral Artifact: Periodic spikes (peak:{spectral_peak:.1f}).")

            return max(0, min(100, score)), findings

        except Exception as e:
            return 50, [f"Visual analysis engine error: {str(e)}"]

if __name__ == "__main__":
    specialist = VisualSpecialist()
    # Mock test
    print(specialist.analyze(None))
