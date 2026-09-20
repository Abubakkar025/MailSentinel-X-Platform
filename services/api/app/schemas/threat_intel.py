from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class IPReputation(BaseModel):
    ip_address: str
    abuse_score: int = 0
    total_reports: int = 0
    is_malicious: bool = False
    usage_type: Optional[str] = None
    isp: Optional[str] = None
    country: Optional[str] = None
    domain: Optional[str] = None
    raw_response: Dict[str, Any] = {}

class GeoLocation(BaseModel):
    ip_address: str
    country: Optional[str] = "Unknown"
    country_code: Optional[str] = "XX"
    city: Optional[str] = "Unknown"
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0
    asn: Optional[str] = "N/A"
    asn_org: Optional[str] = "N/A"
    isp: Optional[str] = "N/A"
    is_private: bool = False
    label: str = "Approximate Infrastructure Geolocation"

class DomainIntel(BaseModel):
    domain_name: str
    registrar: Optional[str] = None
    registration_date: Optional[str] = None
    age_days: Optional[int] = None
    is_newly_registered: bool = False # < 30 days
    is_suspicious: bool = False
    whois_raw: Dict[str, Any] = {}

class URLScanResult(BaseModel):
    url: str
    domain: Optional[str] = None
    display_text: Optional[str] = None
    is_shortened: bool = False
    is_malicious: bool = False
    threat_type: Optional[str] = None # phishing, malware, credential_harvesting, safe
    detection_count: int = 0
    total_engines: int = 0
    details: Dict[str, Any] = {}
