import exifread
import os
import json

class MetadataForensics:
    def __init__(self):
        self.suspicious_tags = [
            'Software', 'Artist', 'Copyright', 'ImageDescription', 'UserComment', 'XPComment', 'Creator'
        ]
        self.ai_markers = [
            'DALL-E', 'Midjourney', 'Stable Diffusion', 'Adobe Firefly', 'GAN', 'Generative',
            'AI Generated', 'Synth', 'Neural', 'Deepfake', 'Magic Eraser', 'Inpaint'
        ]

    def analyze(self, file_path):
        """
        Analyzes a file's metadata for signs of manipulation or AI generation.
        Returns a score from 0 (Fake) to 100 (Authentic).
        """
        score = 100
        findings = []

        if not os.path.exists(file_path):
            return 0, ["File not found"]

        try:
            # 1. Check for File Integrity (Magic Numbers)
            with open(file_path, 'rb') as f:
                header = f.read(4)
                # Simple check: PNG should start with \x89PNG
                if file_path.lower().endswith('.png') and not header.startswith(b'\x89PNG'):
                    score -= 50
                    findings.append("Integrity Alert: File extension does not match binary headers.")

            # 2. Check for missing EXIF (common in deepfakes/scraping)
            with open(file_path, 'rb') as f:
                tags = exifread.process_file(f)

            if not tags:
                # Many real-world images (screenshots, scans, messaging exports)
                # legitimately lack EXIF. Apply a softer penalty.
                score -= 15
                findings.append("Missing EXIF metadata. This is suspicious for high-end camera originals but common for scans/screenshots.")
            
            # 3. Check for suspicious software tags
            software = str(tags.get('Image Software', ''))
            if software:
                findings.append(f"Software detected: {software}")
                if any(x in software for x in ['Photoshop', 'GIMP', 'Inpaint', 'Krita']):
                    score -= 45
                    findings.append("Manipulation software detected in metadata.")
            
            # 4. Check for obvious AI markers in any tag
            expanded_markers = self.ai_markers + ['FLUX.1', 'Grok-2', 'Aura', 'Black Forest Labs', 'Recraft']
            for tag, value in tags.items():
                val_str = str(value)
                if any(marker.lower() in val_str.lower() for marker in expanded_markers):
                    score -= 90
                    findings.append(f"AI Generator marker found in tag {tag}: {val_str}")
            
            # 5. Check for camera model (lack of it is mildly suspicious for \"real\" photos)
            if 'Image Make' not in tags and 'Image Model' not in tags:
                score -= 5
                findings.append("No explicit camera make/model information found.")

        except Exception as e:
            findings.append(f"Analysis error: {str(e)}")
            score = 50

        # Bound score
        score = max(0, min(100, score))
        return score, findings

if __name__ == "__main__":
    # Test stub
    engine = MetadataForensics()
    # score, logs = engine.analyze("path_to_sample.jpg")
    # print(f"Score: {score}, Logs: {logs}")
