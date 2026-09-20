from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.schemas.email import EmailParsed, AttachmentInfo
from app.schemas.case import RiskFactor, CaseResponse
from app.schemas.threat_intel import GeoLocation, IPReputation, DomainIntel, URLScanResult

class RiskScoreResponse(BaseModel):
    score: int
    severity: str
    threat_type: str
    factors: List[RiskFactor]

class InvestigationResult(BaseModel):
    case: CaseResponse
    email: EmailParsed
    risk_assessment: RiskScoreResponse
    ip_locations: List[GeoLocation] = []
    ip_reputations: List[IPReputation] = []
    domain_intel: List[DomainIntel] = []
    url_scans: List[URLScanResult] = []
    attachments: List[AttachmentInfo] = []
    campaign_id: Optional[str] = None
    forensic_evidence_id: str
    sha256_fingerprint: str

class PipelineStatus(BaseModel):
    case_id: str
    status: str # queued, parsing, analyzing_threats, scoring, ai_evaluating, complete, failed
    progress_pct: int
    message: str
