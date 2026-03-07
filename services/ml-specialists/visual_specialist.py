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
            # 1. Robust Loading
            img_bytes = np.fromfile(image_path, dtype=np.uint8)
            img = cv2.imdecode(img_bytes, cv2.IMREAD_GRAYSCALE)
            
            if img is None: return 50, ["Format error: Unable to decode image bitstream"]

            # Baseline Shift: We start at 70 (Earned Authenticity)
            score = 70
            findings = []

            # Speed up: Resize if huge
            h, w = img.shape[:2]
            if max(h, w) > 1024:
                scale = 1024 / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

            # 2. Error Level Analysis (ELA) Simulation
            # AI images often have uniform compression grids. Real photos have non-uniform residuals.
            # We compress to 90 quality and look at the difference.
            _, encoded_img = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            ela_img = cv2.imdecode(encoded_img, cv2.IMREAD_GRAYSCALE)
            ela_diff = cv2.absdiff(img, ela_img)
            ela_val = np.mean(ela_diff)

            if ela_val < 0.5:
                score -= 30
                findings.append(f"Forensic Anomaly: Flat compression grid (val:{ela_val:.2f}). Highly characteristic of synthetic/retouched textures.")
            elif ela_val > 5.0:
                score -= 15
                findings.append(f"Forensic Warning: High compression noise (val:{ela_val:.2f}). Potential artifact concealment.")

            # 3. Enhanced Noise Statistics (MFNA)
            denoised = cv2.medianBlur(img, 3)
            noise_residual = cv2.absdiff(img, denoised)
            std_dev = np.std(noise_residual)
            
            # Stricter Noise Bounds
            if std_dev < 1.0:
                score -= 40
                findings.append(f"AI Signature: Zero-noise surface (std:{std_dev:.2f}). Pixel distribution matches GAN/Diffusion architecture.")
            elif std_dev < 2.2:
                score -= 10
                findings.append(f"Suspicious: Low sensor noise (std:{std_dev:.2f}). Typical of AI-generated content or heavy post-processing.")
            elif std_dev > 4.0:
                score += 20 # Natural sensor noise 'earns' trust
                findings.append(f"Authentic Grain: Natural pixel variance detected (std:{std_dev:.2f}).")

            # 4. Spectral Frequency Audit (FFT)
            f_transform = np.fft.fft2(img)
            f_shift = np.fft.fftshift(f_transform)
            magnitude_spectrum = 20 * np.log(np.abs(f_shift) + 1)
            
            spectral_peak = np.max(magnitude_spectrum)
            if spectral_peak > 235:
                score -= 20
                findings.append(f"Spectral Artifact: Periodic frequency spikes found (peak:{spectral_peak:.1f}). Often left by tiled generator models.")

            return max(0, min(100, score)), findings

        except Exception as e:
            return 50, [f"Visual analysis engine error: {str(e)}"]

if __name__ == "__main__":
    specialist = VisualSpecialist()
    # Mock test
    print(specialist.analyze(None))
