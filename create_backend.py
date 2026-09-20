import os
from pathlib import Path

BASE_DIR = Path(r"c:\Users\Abu\Downloads\sih\backend")

FILES = {}

FILES["requirements.txt"] = """fastapi==0.115.0
uvicorn[standard]==0.30.0
python-multipart==0.0.9
pydantic==2.9.0
pydantic-settings==2.5.0
httpx==0.27.0
redis==5.1.0
supabase==2.9.0
python-jose[cryptography]==3.3.0
slowapi==0.1.9
python-dotenv==1.0.1
google-generativeai==0.8.0
beautifulsoup4==4.12.3
urlextract3==2.0.0
Jinja2==3.1.4
weasyprint==62.0
"""

FILES["app/__init__.py"] = ""
FILES["app/api/__init__.py"] = ""
FILES["app/api/v1/__init__.py"] = ""
FILES["app/models/__init__.py"] = ""
FILES["app/schemas/__init__.py"] = ""
FILES["app/services/__init__.py"] = ""
FILES["app/core/__init__.py"] = ""
FILES["app/utils/__init__.py"] = ""

FILES["app/config.py"] = """from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"
    GEMINI_API_KEY: Optional[str] = None
    ABUSEIPDB_API_KEY: Optional[str] = None
    VIRUSTOTAL_API_KEY: Optional[str] = None
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    DEMO_MODE: bool = True
    MAX_UPLOAD_SIZE_MB: int = 10
    API_RATE_LIMIT: str = "100/minute"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
"""

FILES["app/main.py"] = """from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time

from app.config import settings
from app.api.v1.router import api_router
from app.core.rate_limiter import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to Redis, etc.
    yield
    # Shutdown: close connections

app = FastAPI(
    title="MailSentinel X API",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": app.version}
"""

FILES["app/database.py"] = """from supabase import create_client, Client
import redis.asyncio as redis
from app.config import settings

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_redis():
    return redis.from_url(settings.REDIS_URL, decode_responses=True)
"""

FILES["app/api/deps.py"] = """from fastapi import Depends, HTTPException, status, Header
from jose import jwt, JWTError
from app.database import get_supabase, get_redis
from app.config import settings
from typing import Optional

def get_db():
    return get_supabase()

def get_cache():
    return get_redis()

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.split(" ")[1]
    try:
        # In a real app, verify with Supabase JWT secret
        payload = jwt.decode(token, settings.SUPABASE_KEY, algorithms=["HS256"], options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not found")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(user=Depends(get_current_user)):
    role = user.get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user
"""

FILES["app/api/v1/router.py"] = """from fastapi import APIRouter
from app.api.v1 import auth, dashboard, investigate, cases, threat_intel, ai_analyst, campaigns, reports, demo

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(investigate.router, prefix="/investigate", tags=["investigate"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(threat_intel.router, prefix="/threat-intel", tags=["threat_intel"])
api_router.include_router(ai_analyst.router, prefix="/ai", tags=["ai"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(demo.router, prefix="/demo", tags=["demo"])
"""

FILES["app/api/v1/auth.py"] = """from fastapi import APIRouter, Depends
from app.api.deps import get_current_user, get_db

router = APIRouter()

@router.post("/login")
async def login(db=Depends(get_db)):
    return {"message": "login stub"}

@router.post("/signup")
async def signup(db=Depends(get_db)):
    return {"message": "signup stub"}

@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    return {"user": user}

@router.patch("/me")
async def update_me(user=Depends(get_current_user)):
    return {"message": "updated"}
"""

FILES["app/api/v1/dashboard.py"] = """from fastapi import APIRouter, Depends
from app.api.deps import get_db

router = APIRouter()

@router.get("/stats")
async def get_stats(db=Depends(get_db)):
    return {"total_analyzed": 150, "threats_detected": 45, "critical_incidents": 12, "phishing_count": 20, "bec_count": 5}

@router.get("/threat-chart")
async def get_threat_chart(db=Depends(get_db)):
    return [{"date": "2023-10-01", "severity": "high", "count": 5}]

@router.get("/recent-cases")
async def get_recent_cases(db=Depends(get_db)):
    return [{"id": "case1", "title": "Phishing Email"}]

@router.get("/geo-threats")
async def get_geo_threats(db=Depends(get_db)):
    return [{"ip": "1.1.1.1", "lat": 0.0, "lng": 0.0}]
"""

FILES["app/api/v1/investigate.py"] = """from fastapi import APIRouter, UploadFile, File
router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    return {"case_id": "123", "summary": "Uploaded and analyzed"}

@router.get("/{case_id}/status")
async def get_status(case_id: str):
    return {"status": "completed"}
"""

FILES["app/api/v1/cases.py"] = """from fastapi import APIRouter
router = APIRouter()

@router.get("")
async def get_cases(page: int = 1, page_size: int = 10):
    return {"items": [], "total": 0}

@router.get("/{id}")
async def get_case(id: str):
    return {"id": id}

@router.patch("/{id}")
async def update_case(id: str):
    return {"message": "updated"}

@router.delete("/{id}")
async def delete_case(id: str):
    return {"message": "deleted"}

@router.get("/{id}/email")
async def get_case_email(id: str):
    return {"parsed_email": {}}

@router.get("/{id}/indicators")
async def get_case_indicators(id: str):
    return {"ips": [], "domains": []}

@router.get("/{id}/timeline")
async def get_case_timeline(id: str):
    return {"events": []}

@router.get("/{id}/graph")
async def get_case_graph(id: str):
    return {"nodes": [], "edges": []}
"""

FILES["app/api/v1/threat_intel.py"] = """from fastapi import APIRouter
router = APIRouter()

@router.get("/ip/{ip}")
async def get_ip_intel(ip: str):
    return {"ip": ip, "reputation": "good"}

@router.get("/domain/{domain}")
async def get_domain_intel(domain: str):
    return {"domain": domain, "reputation": "good"}

@router.get("/url")
async def get_url_intel(url: str):
    return {"url": url, "reputation": "good"}
"""

FILES["app/api/v1/ai_analyst.py"] = """from fastapi import APIRouter
router = APIRouter()

@router.post("/chat")
async def ai_chat():
    return {"response": "AI analysis result"}

@router.get("/history/{case_id}")
async def ai_history(case_id: str):
    return {"history": []}
"""

FILES["app/api/v1/campaigns.py"] = """from fastapi import APIRouter
router = APIRouter()

@router.get("")
async def list_campaigns():
    return []

@router.get("/{id}")
async def get_campaign(id: str):
    return {"id": id}
"""

FILES["app/api/v1/reports.py"] = """from fastapi import APIRouter
router = APIRouter()

@router.post("/{case_id}/generate")
async def generate_report(case_id: str):
    return {"url": f"http://localhost:8000/api/v1/reports/{case_id}/download"}

@router.get("/{case_id}")
async def download_report(case_id: str):
    return {"content": "HTML Report"}
"""

FILES["app/api/v1/demo.py"] = """from fastapi import APIRouter
router = APIRouter()

@router.post("/seed")
async def seed_demo():
    return {"message": "Demo data seeded"}

@router.post("/reset")
async def reset_demo():
    return {"message": "Demo data reset"}
"""

FILES["app/schemas/case.py"] = """from pydantic import BaseModel
from typing import Optional

class CaseCreate(BaseModel):
    title: str

class CaseUpdate(BaseModel):
    status: Optional[str]

class CaseResponse(BaseModel):
    id: str
    title: str

class CaseListResponse(BaseModel):
    items: list[CaseResponse]

class CaseDetail(CaseResponse):
    details: str
"""

FILES["app/schemas/email.py"] = """from pydantic import BaseModel
from typing import Optional

class AuthResults(BaseModel):
    spf: str
    dkim: str
    dmarc: str

class EmailParsed(BaseModel):
    subject: str
    sender: str
"""

FILES["app/schemas/investigation.py"] = """from pydantic import BaseModel

class PipelineStatus(BaseModel):
    status: str

class RiskScoreResponse(BaseModel):
    score: int

class InvestigationResult(BaseModel):
    case_id: str
"""

FILES["app/schemas/threat_intel.py"] = """from pydantic import BaseModel

class IPReputation(BaseModel):
    ip: str

class DomainIntel(BaseModel):
    domain: str

class URLScanResult(BaseModel):
    url: str

class GeoLocation(BaseModel):
    country: str
"""

FILES["app/schemas/ai.py"] = """from pydantic import BaseModel

class AIQueryRequest(BaseModel):
    query: str

class AIResponse(BaseModel):
    response: str

class AIHistoryItem(BaseModel):
    id: str
"""

FILES["app/schemas/report.py"] = """from pydantic import BaseModel

class ReportRequest(BaseModel):
    case_id: str

class ReportResponse(BaseModel):
    url: str
"""

FILES["app/services/email_parser.py"] = """def parse_eml(file_bytes: bytes):
    return {}
"""

FILES["app/services/auth_analyzer.py"] = """def analyze_auth(auth_results_header: str):
    return {}
"""

FILES["app/services/risk_engine.py"] = """def calculate_risk(email_parsed, auth_results, ip_indicators, url_indicators, attachment_info, content_analysis):
    return {}
"""

FILES["app/services/threat_intel.py"] = """def check_ip_reputation(ip: str):
    return {}

def check_url(url: str):
    return {}

def check_domain(domain: str):
    return {}
"""

FILES["app/services/geolocation.py"] = """def geolocate_ip(ip: str):
    return {}
"""

FILES["app/services/ai_analyst.py"] = """def analyze(case_context: dict, query: str) -> str:
    return ""
"""

FILES["app/services/campaign_engine.py"] = """def correlate(case_id, indicators):
    return None
"""

FILES["app/services/forensic_service.py"] = """def log_event(case_id, event_type, actor, details, evidence_hash):
    pass
"""

FILES["app/services/report_generator.py"] = """def generate_report(case_id) -> str:
    return "<html></html>"
"""

FILES["app/services/demo_data.py"] = """def get_demo_cases():
    return []

def get_demo_ip_reputation(ip):
    return {}

def get_demo_geolocation(ip):
    return {}

def get_demo_domain_intel(domain):
    return {}
"""

FILES["app/core/security.py"] = """def verify_supabase_jwt(token: str) -> dict:
    return {}
"""

FILES["app/core/rate_limiter.py"] = """from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
"""

FILES["app/core/audit.py"] = """def log_audit(user_id, action, resource_type, resource_id, details, ip, user_agent):
    pass
"""

FILES["app/utils/hashing.py"] = """import hashlib

def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def compute_md5(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()
"""

FILES["app/utils/ip_extractor.py"] = """def extract_ips(text: str) -> list[str]:
    return []

def filter_public_ips(ips: list[str]) -> list[str]:
    return []

def is_private_ip(ip: str) -> bool:
    return False
"""

FILES["app/utils/url_extractor.py"] = """def extract_urls(text: str, html: str = None) -> list[dict]:
    return []
"""

FILES["app/utils/domain_utils.py"] = """def extract_domain(email_or_url: str) -> str:
    return ""

def is_free_email_provider(domain: str) -> bool:
    return False

def check_typosquatting(domain: str, known_domains: list[str]) -> tuple[bool, str, int]:
    return False, "", 0
"""

FILES["Dockerfile"] = """FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd -m appuser && chown -R appuser /app
USER appuser
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
"""

FILES[".env.example"] = """SUPABASE_URL=http://localhost:8000
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=your_gemini_api_key
ABUSEIPDB_API_KEY=
VIRUSTOTAL_API_KEY=
CORS_ORIGINS=["http://localhost:3000"]
DEMO_MODE=True
MAX_UPLOAD_SIZE_MB=10
API_RATE_LIMIT=100/minute
"""

def main():
    for rel_path, content in FILES.items():
        full_path = BASE_DIR / rel_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
            
if __name__ == "__main__":
    main()
