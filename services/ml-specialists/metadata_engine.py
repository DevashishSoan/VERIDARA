import exifread
import os
import json

class MetadataForensics:
    def __init__(self):
        self.suspicious_tags = [
            'Software', 'Artist', 'Copyright', 'ImageDescription'
        ]
        self.ai_markers = [
            'DALL-E', 'Midjourney', 'Stable Diffusion', 'Adobe Firefly', 'GAN', 'Generative'
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
            with open(file_path, 'rb') as f:
                tags = exifread.process_file(f)

            # 1. Check for missing EXIF (common in deepfakes/scraping)
            if not tags:
                score -= 30
                findings.append("Missing EXIF metadata (often stripped by manipulation tools)")
            
            # 2. Check for suspicious software tags
            software = str(tags.get('Image Software', ''))
            if software:
                findings.append(f"Software detected: {software}")
                if any(x in software for x in ['Photoshop', 'GIMP', 'Inpaint']):
                    score -= 40
                    findings.append("Manipulation software detected in metadata")
            
            # 3. Check for obvious AI markers in any tag
            for tag, value in tags.items():
                val_str = str(value)
                if any(marker.lower() in val_str.lower() for marker in self.ai_markers):
                    score -= 80
                    findings.append(f"AI Generator marker found in tag {tag}: {val_str}")
            
            # 4. Check for camera model (lack of it is suspicious for "real" photos)
            if 'Image Make' not in tags and 'Image Model' not in tags:
                score -= 10
                findings.append("No camera make/model information")

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
