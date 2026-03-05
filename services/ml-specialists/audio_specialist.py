import librosa
import numpy as np
import os

class AudioSpecialist:
    def __init__(self):
        self.name = "Audio Forensics Specialist"

    def analyze(self, audio_path):
        """
        Real Forensic Analysis: Spectral Flux & Frequency Jitter.
        Measures the rate of change of spectral power. AI voices often lack the 
        micro-variance of natural vocal folds.
        """
        if not audio_path or not os.path.exists(audio_path):
            return 80, ["Audio analysis skipped: File not provided/accessible"]

        try:
            # 1. Load Audio Bytes & Compute STFT
            # sr=None skips resampling (2x speedup), duration=6 is enough for forensics
            y, sr = librosa.load(audio_path, duration=6, sr=None)
            S = np.abs(librosa.stft(y))
            
            # 2. Compute Spectral Flux (normalized energy transitions)
            diff = np.diff(S, axis=1)
            flux = np.sqrt(np.mean(diff**2)) / (np.mean(S) + 1e-9)
            
            # 3. Compute Spectral Flatness (Peakiness check)
            # Low flatness = Tonality (Pure tones, AI clones), High = Noise (Natural voice)
            flatness = np.mean(librosa.feature.spectral_flatness(y=y))
            
            # 4. Zero-Crossing Rate (Consistency check)
            zcr = np.mean(librosa.feature.zero_crossing_rate(y))

            score = 100
            findings = []

            # 5. Composite Scoring: Low flux or extreme flatness suggests synthetic origin
            if flatness < 0.0001:
                score -= 60
                findings.append(f"CRITICAL: Unnatural spectral tonality (flatness: {flatness:.6f}). Characteristic of pure synthesis.")
            elif flux < 0.5: # Corrected threshold for noisy authentic speech
                score -= 30
                findings.append(f"WARNING: Low frequency jitter detected (flux: {flux:.4f}). Potential AI post-processing.")
            else:
                findings.append(f"Natural spectral jitter and noise floor detected (flux: {flux:.4f}, flatness: {flatness:.6f}).")

            # 6. High-frequency noise artifacts consistent with low-bitrate AI generation
            # Only suspicious if the overall signal is 'clean' (low flatness)
            if zcr > 0.5 and flatness < 0.01:
                score -= 10
                findings.append("High-frequency noise artifacts consistent with low-bitrate AI generation found.")

            return max(0, min(100, score)), findings

        except Exception as e:
            return 50, [f"Audio forensic failure: {str(e)}"]

if __name__ == "__main__":
    specialist = AudioSpecialist()
    # Mock test
    print(specialist.analyze(None))
