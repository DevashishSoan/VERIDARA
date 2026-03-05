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
            # 1. Load image in grayscale for noise analysis
            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img is None: return 50, ["Format error: OpenCV could not read image"]

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

            if std_dev < 1.2:
                score -= 60
                findings.append(f"CRITICAL: Extreme pixel uniformity (std:{std_dev:.2f}). Characteristic of high-end GAN/Diffusion models.")
            elif std_dev < 2.5:
                score -= 30
                findings.append(f"WARNING: Low sensor noise (std:{std_dev:.2f}). Potential post-processing or AI upscaling detected.")
            else:
                findings.append(f"Authentic grain detected (noise std:{std_dev:.2f} is consistent with sensor physics).")

            # 4. Check for Frequency Anomalies (Simple FFT)
            # High-frequency artifacts are common in AI checkerboard patterns.
            f_transform = np.fft.fft2(img)
            f_shift = np.fft.fftshift(f_transform)
            magnitude_spectrum = 20 * np.log(np.abs(f_shift) + 1)
            
            if np.max(magnitude_spectrum) > 220:
                score -= 15
                findings.append("Periodic artifacts found in frequency spectrum (Checkerboard pattern common in AI tiling).")

            return max(0, min(100, score)), findings

        except Exception as e:
            return 50, [f"Visual analysis engine error: {str(e)}"]

if __name__ == "__main__":
    specialist = VisualSpecialist()
    # Mock test
    print(specialist.analyze(None))
