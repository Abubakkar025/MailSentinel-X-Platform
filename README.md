# MailSentinel X 🛡️⚡

> AI-Powered Email Threat Detection, Geolocation, Threat-Intelligence & Digital-Forensics Platform for SOC Analysts.

MailSentinel X is a production-style cybersecurity platform engineered for SOC analysts and incident responders. It ingests raw `.eml` RFC 5322 MIME email files, parses complex header structures, evaluates SPF/DKIM/DMARC authentication, queries modular threat intelligence providers, geolocates originating relay IPs, computes an explainable 0–100 risk score, correlates threat campaign clusters, logs immutable forensic evidence trails, and provides an AI SOC Copilot powered by Gemini.

---

## 🌟 Key Features

1. **Email Investigation Pipeline**: Upload `.eml` files to extract headers, Received chain hops, public IPs, domains, URLs, and attachments with SHA-256 evidence hashing.
2. **Explainable 0–100 Risk Engine**: Multi-factor scoring with individual evidence factor points across Auth, Headers, Domains, URLs, IPs, Attachments, and Content heuristics.
3. **Modular Threat Intelligence**:
   - **IP Reputation**: AbuseIPDB, VirusTotal, GreyNoise.
   - **URL Scanning**: VirusTotal URL API, shortener resolution, anchor text mismatch detection.
   - **Domain Intel**: ICANN RDAP (RFC 7480) & Levenshtein distance typosquatting checks.
   - **Geolocation**: ip-api.com IP geolocation mapping.
4. **Interactive Threat Graph**: React Flow visualizer linking `Email ➔ IP ➔ Domain ➔ URL ➔ Campaign`.
5. **AI SOC Copilot**: Evidence-grounded AI analyst assistant powered by Gemini 2.0 Flash.
6. **Campaign Correlation Engine**: Automated clustering of shared IPs, domain lookalikes, URLs, and attachment hashes.
7. **Digital Forensics Chain of Custody**: Immutable event logging with SHA-256 evidence verification.
8. **Forensic Report Generator**: One-click downloadable HTML audit reports.
9. **Global Threat Map**: MapLibre GL dark-themed threat map visualization.
10. **Demo Mode**: Includes 5 realistic sample emails (Benign, Phishing, BEC, Executive Impersonation, Malware Delivery) for offline hackathon demonstrations.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui design system, Recharts, MapLibre GL (`react-map-gl`), React Flow (`@xyflow/react`).
- **Backend**: Python FastAPI, Pydantic v2, HTTPX async client, Jinja2, python-jose.
- **Database**: PostgreSQL / Supabase with Row Level Security (RLS) migrations.
- **Caching & Async**: Redis 7.
- **AI Integration**: Gemini API (`google-generativeai` / server-side proxy).
- **Containerization**: Docker Compose multi-service architecture.

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
Backend API server will run at `http://localhost:8000`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Frontend Web application will run at `http://localhost:3000`.

---

## 🧪 Running the Backend Test Suite

Run the full backend test suite covering email parsing, authentication headers, explainable risk scoring, and API endpoints:

```bash
python run_tests.py
```

---

## 🐳 Docker Compose Deployment

To launch all services (PostgreSQL, Redis, FastAPI Backend, Next.js Frontend) in containerized environment:

```bash
docker-compose up --build
```

Access points:
- **Frontend App**: `http://localhost:3000`
- **Backend API Docs (Swagger)**: `http://localhost:8000/docs`

---

## 📂 Project Structure

```
sih/
├── docker-compose.yml              # Multi-service Docker setup
├── .env.example                    # Environment variables template
├── run_tests.py                    # Complete backend test runner
├── frontend/                       # Next.js 15 + TypeScript + Tailwind
│   ├── src/app/
│   │   ├── (auth)/                 # Login & Signup screens
│   │   └── (protected)/            # SOC Dashboard, Investigate, Cases, Threat Map, Campaigns, Reports, Settings
│   └── src/components/             # UI Layout components & charts
├── backend/                        # FastAPI Python backend
│   ├── app/api/v1/                 # REST API endpoints
│   ├── app/services/               # Parsing, Risk Engine, Threat Intel, Geolocation, AI Copilot, Forensics
│   └── app/schemas/                # Pydantic data validation schemas
├── supabase/migrations/            # PostgreSQL database schema & RLS policies
└── tests/                          # Backend unit & integration tests and sample .eml files
```
