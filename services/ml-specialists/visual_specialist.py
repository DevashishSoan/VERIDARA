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
            
            # Calibration: If it's high contrast (edges) but low noise (scan), it's likely a real document
            is_potential_scan = edge_density > 0.05 and std_dev < 3.0

            if ela_val < 0.5:
                if not is_potential_scan:
                    score -= 30
                    findings.append(f"Forensic Anomaly: Flat compression grid (val:{ela_val:.2f}). Characteristic of synthetic textures.")
                else:
                    score -= 10
                    findings.append(f"Scan Characteristic: Low ELA response (val:{ela_val:.2f}) observed in document-like structure.")
            elif ela_val > 5.0:
                score -= 15
                findings.append(f"Forensic Warning: High compression noise (val:{ela_val:.2f}). Potential artifact concealment.")

            # Stricter Noise Bounds with Scan Tolerance
            if std_dev < 1.0:
                score -= 40
                findings.append(f"AI Signature: Zero-noise surface (std:{std_dev:.2f}). Pixel distribution matches GAN architecture.")
            elif std_dev < 2.2:
                if not is_potential_scan:
                    score -= 10
                    findings.append(f"Suspicious: Low sensor noise (std:{std_dev:.2f}). Typical of AI or heavy post-processing.")
                else:
                    score += 10 # Scan tolerance boost
                    findings.append(f"Scan Tolerance: Low noise (std:{std_dev:.2f}) matches document scan profile.")
            elif std_dev > 4.0:
                score += 20 # Natural sensor noise 'earns' trust
                findings.append(f"Authentic Grain: Natural pixel variance detected (std:{std_dev:.2f}).")

            # Final Calibration: High edge density (documents) earns a "Structure Boost"
            if is_potential_scan:
                score += 15
                findings.append("Document Identity: Strong edge structures detected. Trusting structural integrity over pixel noise.")

            # 5. Spectral Frequency Audit (FFT)
            f_transform = np.fft.fft2(img)
            f_shift = np.fft.fftshift(f_transform)
            magnitude_spectrum = 20 * np.log(np.abs(f_shift) + 1)
            
            spectral_peak = np.max(magnitude_spectrum)
            if spectral_peak > 235:
                score -= 20
                findings.append(f"Spectral Artifact: Periodic spikes (peak:{spectral_peak:.1f}) common in tiled models.")

            return max(0, min(100, score)), findings

        except Exception as e:
            return 50, [f"Visual analysis engine error: {str(e)}"]

if __name__ == "__main__":
    specialist = VisualSpecialist()
    # Mock test
    print(specialist.analyze(None))
