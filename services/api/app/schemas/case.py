from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class RiskFactor(BaseModel):
    name: str
    points: int
    max_points: int
    evidence: str
    triggered: bool
    category: str # 'auth', 'header', 'domain', 'url', 'ip', 'attachment', 'content'

class CaseBase(BaseModel):
    title: str
    status: str = "open" # open, investigating, resolved, closed
    severity: str = "medium" # critical, high, medium, low, info
    threat_type: str = "suspicious" # phishing, bec, spoofing, malware, credential_harvesting, social_engineering, suspicious, benign
    risk_score: int = Field(default=0, ge=0, le=100)
    verdict: Optional[str] = None
    assigned_to: Optional[str] = None
    campaign_id: Optional[str] = None
    is_demo: bool = False

class CaseCreate(CaseBase):
    case_number: Optional[str] = None
    created_by: Optional[str] = None
    risk_factors: List[RiskFactor] = []

class CaseUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    threat_type: Optional[str] = None
    verdict: Optional[str] = None
    assigned_to: Optional[str] = None
    campaign_id: Optional[str] = None

class CaseResponse(CaseBase):
    id: str
    case_number: str
    risk_factors: List[Dict[str, Any]] = []
    created_by: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class CaseListResponse(BaseModel):
    items: List[CaseResponse]
    total: int
    page: int
    page_size: int
