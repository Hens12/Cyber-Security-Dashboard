# SENTINEL-X — Cyber Security Operations Center (SOC) Dashboard

**Codename: SENTINEL-X**

SENTINEL-X is a production-quality, futuristic Cyber Security Operations Center (SOC) Dashboard designed for real-time security monitoring, packet analysis, threat intelligence, and automated incident response orchestration (SOAR). It combines a dark, military command center style interface with actionable, risk-aligned metrics for security analysts.

---

## 1. Features & Capabilities

- **Overview Dashboard:** Central SOC screen displaying security posture score (87/100 default), active threats, incidents, packets/sec, blocked IPs, and telemetry trends.
- **Live Global Threat Map:** Canvas-based interactive visualization showing attacker source, target, curved attack vectors, threat density heatmap, and live attack particles.
- **Network Monitor:** Real-time throughput (Mbps), protocol distributions (HTTPS, DNS, SSH, etc.), top talkers, and packets/sec traffic metrics.
- **Packet Analyzer:** Hex-inspector ready packet table tracking timestamps, source/destination ports, protocol flags, size, status, and threat classification.
- **Threat Intelligence:** Reputational checks for IPs, domains, URLs, hashes, and nation-state actor profiles.
- **Vulnerability Scanner:** CVE inventory with CVSS scoring, services, ports, detection status, and patch remediation guidance.
- **Incident Response Center:** Card-based workflow tracking incidents (NEW, TRIAGED, INVESTIGATING, CONTAINED, RESOLVED, FALSE_POSITIVE) with vertical timelines and manual response controls.
- **Response Actions (SOAR):** Direct buttons to Block IP, Isolate Host, Disable Account, and Terminate Session.
- **AI Security Analyst:** Contextual assessment of telemetry, threat explanations, recommended investigation steps, and containment tasks.
- **MITRE ATT&CK Visualization:** Matrix tracking adversarial tactics and techniques (from Initial Access to Impact) with event correlation.
- **Security Logs:** Scrolling terminal-style log viewer with pause/resume, search, and severity color schemes.
- **Automation Center:** SOAR playbook visual steps (Trigger → Analyze → Decision → Action → Notification).
- **Command Palette:** Global modal search (Ctrl+K) for searching hosts, incidents, logs, CVEs, and threats.

---

## 2. Tech Stack

### Frontend
- **Framework:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Vanilla CSS (subtle gradients, scanlines, particle grid)
- **State Management:** Zustand
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Icons:** Lucide React

### Backend
- **Framework:** Python 3.11, FastAPI
- **Real-Time Stream:** WebSockets ASGI
- **Data Schemas:** Pydantic v2
- **ORMs:** SQLAlchemy (Asynchronous sqlite/postgres adapters)
- **Infrastructure:** Redis (optional caching), PostgreSQL (optional production db)

---

## 3. Installation & Run Instructions

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (optional for production container deployment)

### Local Dev Setup

#### 1. Start Backend

##### Option A: Using the pre-packaged Portable Python (Windows)
Since this repository includes a portable Python environment with all dependencies pre-installed, you can run the server directly without creating a virtual environment:
```bash
cd backend
.\python_portable\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

##### Option B: Using a standard global Python installation
If you want to use your own global Python installation:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
FastAPI server will start on [http://localhost:8000](http://localhost:8000).

#### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Vite dev server will start on [http://localhost:5173](http://localhost:5173).

---

## 4. Docker Deployment

Launch the entire stack (Frontend, Backend, PostgreSQL database, and Redis cache) using:
```bash
docker compose up --build
```
- Frontend will be exposed on port `80` ([http://localhost:80](http://localhost:80)).
- Backend API will be exposed on port `8000`.

---

## 5. API & WebSocket Documentation

### REST endpoints
- `GET /api/dashboard` — Main KPI counters and security score.
- `GET /api/threats` — List of active security threats.
- `GET /api/incidents` — Current open incident queue.
- `GET /api/vulnerabilities` — Scanned CVE items.
- `GET /api/hosts` — Monitored host server hardware and port status.
- `GET /api/network/traffic` — Network throughput statistics.
- `GET /api/network/packets` — Monitored packet streams.
- `GET /api/logs` — Terminal log entries.
- `GET /api/analytics` — Historical charts and graphs datasets.
- `GET /api/system/status` — Operational system states.
- `POST /api/auth/login` — Login credentials authorization.

### WebSocket endpoints
- `WS /ws/security-events` — Live WebSocket connection streaming JSON threat events continuously to updating components.

---

## 6. Safety & Simulation Design

To ensure safe operational usage:
- **Demo Mode** is enabled by default. No real network scanning, OS commands execution, or external port exploits are executed.
- All response action controls (e.g., Isolate Host, Block IP) are **simulated actions** and will log `SIMULATED_SUCCESS` in the audit history.
- CVE numbers and attack vectors are clearly labeled as **Demo Telemetry** to avoid triggering false alarms in active intrusion detection systems.
