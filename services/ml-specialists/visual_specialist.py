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

    def _extract_frames(self, video_path, count=5):
        """Extracts N equidistant frames from a video file."""
        frames = []
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return []
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0: return []
        
        step = max(1, total_frames // (count + 1))
        for i in range(count):
            cap.set(cv2.CAP_PROP_POS_FRAMES, (i + 1) * step)
            ret, frame = cap.read()
            if ret:
                frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
        cap.release()
        return frames

    def analyze(self, image_path):
        """
        Forensic Analysis Engine: Supports Static Images and MP4 Video sampled frame analysis.
        """
        if not image_path or not os.path.exists(image_path):
            return 50, ["Visual analysis skipped: File not accessible"]

        ext = os.path.splitext(image_path)[1].lower()
        is_video = ext in ['.mp4', '.avi', '.mov', '.mkv']
        
        try:
            frames = []
            findings = []
            
            if is_video:
                frames = self._extract_frames(image_path)
                if not frames: return 50, ["Video error: Unable to extract frames"]
                findings.append(f"Video Node: Analyzed {len(frames)} temporal samples.")
            else:
                img_bytes = np.fromfile(image_path, dtype=np.uint8)
                img_bgr = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)
                if img_bgr is None: return 50, ["Format error: Image decode failed"]
                frames = [cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)]

            scores = []
            frame_stds = []

            for img in frames:
                score = 50
                h, w = img.shape[:2]
                
                # Global scale for performance
                if max(h, w) > 1024:
                    scale = 1024 / max(h, w)
                    img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

                # 1. MFNA Noise Statistics
                denoised = cv2.medianBlur(img, 3)
                noise_residual = cv2.absdiff(img, denoised)
                std_dev = np.std(noise_residual)
                frame_stds.append(std_dev)

                # 2. Texture & Flatness Law
                block_size = 32
                blocks_h, blocks_w = img.shape[0] // block_size, img.shape[1] // block_size
                flat_blocks = 0
                for i in range(blocks_h):
                    for j in range(blocks_w):
                        block = noise_residual[i*block_size:(i+1)*block_size, j*block_size:(j+1)*block_size]
                        if np.std(block) < 0.8: flat_blocks += 1
                flat_ratio = flat_blocks / (blocks_h * blocks_w) if blocks_h * blocks_w > 0 else 0

                # --- Forensic Scoring Logic ---
                # Noise penalty/boost
                if std_dev < 1.0:
                    score -= (40 * (1.0 - std_dev))
                elif std_dev > AUTHENTIC_STD_DEV_MIN:
                    score += min(35, 35 * ((std_dev - AUTHENTIC_STD_DEV_MIN) / 5.0))
                
                # Flatness penalty
                if flat_ratio > 0.05:
                    score -= min(45, (flat_ratio / FLAT_RATIO_THRESHOLD) * 45)

                scores.append(score)

            avg_score = sum(scores) / len(scores)
            
            # Temporal Stability Check (Video Only)
            if is_video and len(frame_stds) > 1:
                t_var = np.std(frame_stds)
                if t_var > 2.0:
                    avg_score -= 30
                    findings.append(f"Temporal Anomaly: Noise instability found (var:{t_var:.2f}).")
                else:
                    avg_score += 10
                    findings.append("Temporal Consistency: Stable sensor grain verified across frames.")

            final_score = max(0, min(100, avg_score))
            return final_score, findings[:3]

        except Exception as e:
            return 50, [f"Engine error: {str(e)}"]

if __name__ == "__main__":
    specialist = VisualSpecialist()
    print(specialist.analyze("test.mp4"))
