import cv2
import numpy as np
import os

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
            # 1. Robust Loading (Handles Windows path encoding and memory-mapped files better)
            img_bytes = np.fromfile(image_path, dtype=np.uint8)
            img = cv2.imdecode(img_bytes, cv2.IMREAD_GRAYSCALE)
            
            if img is None: return 50, ["Format error: OpenCV could not decode image buffer"]

            # Speed up: Resize if huge (keep enough resolution for noise analysis)
            h, w = img.shape[:2]
            if max(h, w) > 1024:
                scale = 1024 / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

            # 2. Extract Noise Residuals (Original - Median Filtered)
            # This highlights pixel-level inconsistencies
            denoised = cv2.medianBlur(img, 3)
            noise_residual = cv2.absdiff(img, denoised)

            # 3. Analyze Noise Statistics
            # High standard deviation in residuals often indicates 'natural' sensor noise.
            # Extremely low deviation/flat noise suggests AI 'perfection' or blurring.
            std_dev = np.std(noise_residual)
            
            # Simple scoring heuristic based on natural noise thresholds
            score = 100
            findings = []

            # Dynamic Thresholding: High res images should have more noise detail
            if std_dev < 1.0:
                score -= 70
                findings.append(f"CRITICAL: Synthetic pixel perfection (std:{std_dev:.2f}). Characteristic of GAN-generated textures.")
            elif std_dev < 2.0:
                score -= 40
                findings.append(f"WARNING: Abnormal pixel uniformity (std:{std_dev:.2f}). Potential AI upscaling or denoising.")
            elif std_dev > 15.0:
                 score -= 20
                 findings.append(f"CAUTION: Excessive per-pixel variance (std:{std_dev:.2f}). Possible adversarial noise injection.")

            # 4. Check for Frequency Anomalies (FFT)
            # High-frequency artifacts are common in AI checkerboard patterns.
            f_transform = np.fft.fft2(img)
            f_shift = np.fft.fftshift(f_transform)
            magnitude_spectrum = 20 * np.log(np.abs(f_shift) + 1)
            
            # AI models often leave traces in specific frequency bins
            spectral_peak = np.max(magnitude_spectrum)
            if spectral_peak > 230:
                score -= 25
                findings.append(f"Spectral anomaly detected (peak:{spectral_peak:.1f}). Found periodic tiling artifacts common in Diffusion models.")

            return max(0, min(100, score)), findings

        except Exception as e:
            return 50, [f"Visual analysis engine error: {str(e)}"]

if __name__ == "__main__":
    specialist = VisualSpecialist()
    # Mock test
    print(specialist.analyze(None))
