import os
import sys
import json
import argparse
from datetime import datetime

# Add parent directory to path to import specialists
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from visual_specialist import VisualSpecialist
from audio_specialist import AudioSpecialist
from metadata_engine import MetadataForensics

def audit_dataset(dataset_path):
    print(f"--- VERIDARA Dataset Audit Engine ---")
    print(f"Started at: {datetime.now().isoformat()}")
    print(f"Target: {dataset_path}\n")

    visual = VisualSpecialist()
    audio = AudioSpecialist()
    metadata = MetadataForensics()

    results = {
        "summary": {
            "total_files": 0,
            "passed": 0,
            "failed": 0,
            "accuracy": 0.0
        },
        "details": []
    }

    categories = ["authentic", "synthetic"]
    
    for category in categories:
        cat_path = os.path.join(dataset_path, category)
        if not os.path.exists(cat_path):
            print(f"Skipping {category}: Directory not found at {cat_path}")
            continue

        files = [f for f in os.listdir(cat_path) if os.path.isfile(os.path.join(cat_path, f))]
        print(f"Auditing {len(files)} files in [{category}]...")

        for filename in files:
            file_path = os.path.join(cat_path, filename)
            results["summary"]["total_files"] += 1
            
            # Determine specialist based on extension
            ext = filename.lower().split('.')[-1]
            score = 50
            findings = []
            
            if ext in ['jpg', 'jpeg', 'png', 'webp']:
                score, findings = visual.analyze(file_path)
                # Also run metadata for images
                m_score, m_findings = metadata.analyze(file_path)
                score = (score * 0.8) + (m_score * 0.2)
                findings.extend(m_findings)
            elif ext in ['mp3', 'wav', 'm4a']:
                score, findings = audio.analyze(file_path)
            
            # Validation logic
            is_correct = False
            if category == "authentic" and score >= 60:
                is_correct = True
            elif category == "synthetic" and score < 50:
                is_correct = True
            
            if is_correct:
                results["summary"]["passed"] += 1
            else:
                results["summary"]["failed"] += 1
            
            results["details"].append({
                "file": filename,
                "category": category,
                "score": round(score, 2),
                "is_correct": is_correct,
                "findings": findings[:3] # Limit findings in report
            })

    if results["summary"]["total_files"] > 0:
        results["summary"]["accuracy"] = (results["summary"]["passed"] / results["summary"]["total_files"]) * 100

    print(f"\n--- Audit Summary ---")
    print(f"Total Files: {results['summary']['total_files']}")
    print(f"Passed: {results['summary']['passed']}")
    print(f"Failed: {results['summary']['failed']}")
    print(f"Accuracy: {results['summary']['accuracy']:.2f}%")

    # Save report
    report_path = os.path.join(os.path.dirname(__file__), "audit_report.json")
    with open(report_path, "w") as f:
        json.dump(results, f, indent=4)
    print(f"Detailed report saved to: {report_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audit TruthLens forensic specialists against a labeled dataset.")
    parser.add_argument("--path", type=str, default=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "storage", "benchmarks"), help="Path to labeled benchmarks")
    args = parser.parse_args()
    
    audit_dataset(args.path)
