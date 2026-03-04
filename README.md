# 🛡️ VERIDARA
### **The Sovereign Standard for Digital Content Authentication**

**VERIDARA** is a production-grade, multi-modal forensic platform designed to verify the authenticity of digital media in an era of sophisticated generative AI. Moving beyond simple heuristics, VERIDARA utilizes deep signal processing to detect the "hidden fingerprints" left behind by GANs, Diffusion models, and neural voice synthesis.

---

## **🚀 Core Capabilities**

### **🔍 Visual Forensics (MFNA)**
*   **Median Filter Noise Analysis**: Detects pixel-level anomalies by analyzing noise residuals. Identifies the "unnatural perfection" of AI-generated gradients vs. the stochastic grain of natural sensors.
*   **GAN Fingerprinting**: Recognizes architectural inconsistencies in spatial distributions common in Midjourney, DALL-E, and Stable Diffusion outputs.

### **🎙️ Audio Forensics (Spectral Engine)**
*   **Spectral Flux Analysis**: Measures the rate of change in spectral power to identify the robotic smoothness of AI clones (ElevenLabs, RVC).
*   **Spectral Flatness Detection**: Screens for unnatural harmonic tonality found in purely synthesized vocal folds.

### **🔐 Security & Integrity**
*   **HMAC-Signed Certification**: Every forensic report is cryptographically sealed with a unique HMAC-SHA256 signature to ensure chain-of-custody.
*   **Identity Guard**: Secure JWT authentication integrated with Supabase and Row-Level Security (RLS).

---

## **🏗️ Technical Architecture**

VERIDARA utilizes a **Shielded Microservices Architecture**, optimized for high-performance forensic processing:

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React + Vite + Framer Motion | Cinematic UI with 100% Lazy-Loaded components & Suspense. |
| **API Gateway** | Node.js + Express | Orchestration, Authentication, and Aggregation logic. |
| **Ingest Engine** | Python + FastAPI | High-speed file handling, hashing, and asynchronous job queuing. |
| **ML Orchestrator**| Python + FastAPI | Signal processing pipeline using `OpenCV`, `Librosa`, and `NumPy`. |
| **Database** | PostgreSQL + Supabase | Persistent storage for job history and forensic metadata. |

---

## **⚡ Performance Engineering**

*   **Code-Splitting**: Deployed with **React Lazy & Suspense**, reducing initial bundle size by ~25% for instant landing page load times.
*   **Docker Orchestration**: Fully containerized with a unified `docker-compose.yml` for idempotent deployments across cloud providers.
*   **Automated QA**: Comprehensive test coverage (54+ tests) across Jest (Gateway), Pytest (ML/Ingest), and functional forensic suites.

---

## **🐳 Fast Start**

```bash
# Clone the repository
git clone https://github.com/your-username/veridara-monorepo.git

# Launch the shielded environment (requires Docker)
docker-compose up --build
```

---

*“Verify the source. Protect the truth.”* — **VERIDARA**
