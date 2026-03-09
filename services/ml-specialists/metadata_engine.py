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

            # 2. Check for missing EXIF & Tag Entropy
            with open(file_path, 'rb') as f:
                tags = exifread.process_file(f)

            tag_count = len(tags)
            if tag_count == 0:
                score -= 15
                findings.append("Missing EXIF metadata. Suspicious for direct AI generation.")
            else:
                # Tag Entropy Reward: Real photos have 30-100+ tags. AI often has 5-10.
                b_entropy = min(15, tag_count * 0.2)
                score += b_entropy
                findings.append(f"Metadata Entropy: {tag_count} tags found (reward:+{b_entropy:.1f}).")
            
            # 3. Check for suspicious software tags
            software = str(tags.get('Image Software', tags.get('Image Model', '')))
            if software:
                suspicious_apps = ['Photoshop', 'GIMP', 'Inpaint', 'Krita', 'Midjourney', 'DALL-E']
                matches = [app for app in suspicious_apps if app.lower() in software.lower()]
                if matches:
                    p_software = 45 + (len(matches) * 5) # More matches = higher penalty
                    score -= p_software
                    findings.append(f"Manipulation Trace: Found {', '.join(matches)} (penalty:-{p_software}).")
            
            # 4. Check for obvious AI markers in any tag
            expanded_markers = self.ai_markers + ['FLUX.1', 'Grok-2', 'Aura', 'Black Forest Labs', 'Recraft']
            marker_found = False
            for tag, value in tags.items():
                val_str = str(value)
                if any(marker.lower() in val_str.lower() for marker in expanded_markers):
                    score -= 90
                    findings.append(f"AI Generator marker found in tag {tag} (penalty:-90.0).")
                    marker_found = True
                    break # One definitive marker is enough
            
            # 5. Continuous Camera Profile Check
            # Real photos should have Make, Model, and Exposure settings (FNumber, ISOSpeedRatings)
            camera_signals = ['Image Make', 'Image Model', 'EXIF FNumber', 'EXIF ISOSpeedRatings']
            signals_found = sum(1 for s in camera_signals if s in tags)
            if signals_found < 4:
                p_camera = (4 - signals_found) * 5.5 # Continuous penalty
                score -= p_camera
                findings.append(f"Incomplete Camera Profile: Found {signals_found}/4 signals (penalty:-{p_camera:.1f}).")
            else:
                score += 5
                findings.append("Validated Camera Profile: Full exposure metadata present.")

        except Exception as e:
            findings.append(f"Analysis error: {str(e)}")
            score -= 10 # Penalty for corrupted or unreadable metadata

        # Bound score
        score = max(0, min(100, score))
        return score, findings

if __name__ == "__main__":
    # Test stub
    engine = MetadataForensics()
    # score, logs = engine.analyze("path_to_sample.jpg")
    # print(f"Score: {score}, Logs: {logs}")
