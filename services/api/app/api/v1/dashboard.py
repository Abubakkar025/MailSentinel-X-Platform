from fastapi import APIRouter
from typing import List, Dict, Any
from app.api.v1.cases import get_all_active_cases

router = APIRouter(prefix="/dashboard", tags=["SOC Dashboard"])

@router.get("/stats")
async def get_dashboard_stats():
    cases = get_all_active_cases()
    total_analyzed = len(cases)
    threats_detected = sum(1 for c in cases if c.get("risk_score", 0) >= 26)
    critical_incidents = sum(1 for c in cases if c.get("severity") == "critical")
    phishing_count = sum(1 for c in cases if c.get("threat_type") == "phishing")
    bec_count = sum(1 for c in cases if c.get("threat_type") == "bec")

    return {
        "total_analyzed": total_analyzed,
        "threats_detected": threats_detected,
        "critical_incidents": critical_incidents,
        "phishing_count": phishing_count,
        "bec_count": bec_count
    }

@router.get("/threat-chart")
async def get_threat_chart():
    return [
        {"date": "Sep 11", "phishing": 4, "bec": 1, "malware": 2, "benign": 12},
        {"date": "Sep 12", "phishing": 7, "bec": 3, "malware": 1, "benign": 15},
        {"date": "Sep 13", "phishing": 5, "bec": 2, "malware": 4, "benign": 10},
        {"date": "Sep 14", "phishing": 9, "bec": 4, "malware": 3, "benign": 18},
        {"date": "Sep 15", "phishing": 12, "bec": 5, "malware": 6, "benign": 22},
        {"date": "Sep 16", "phishing": 8, "bec": 2, "malware": 5, "benign": 19},
        {"date": "Sep 17", "phishing": 14, "bec": 6, "malware": 8, "benign": 25}
    ]

@router.get("/recent-cases")
async def get_recent_cases():
    cases = get_all_active_cases()
    sorted_cases = sorted(cases, key=lambda c: c.get("created_at", ""), reverse=True)
    return sorted_cases[:10]

@router.get("/geo-threats")
async def get_geo_threats():
    return [
        {"ip": "185.234.72.19", "country": "Russia", "city": "Moscow", "lat": 55.7558, "lng": 37.6173, "abuse_score": 88, "severity": "critical", "case_number": "MS-2026-00001"},
        {"ip": "103.45.67.89", "country": "Vietnam", "city": "Hanoi", "lat": 21.0285, "lng": 105.8542, "abuse_score": 74, "severity": "high", "case_number": "MS-2026-00002"},
        {"ip": "45.133.1.87", "country": "Netherlands", "city": "Amsterdam", "lat": 52.3676, "lng": 4.9041, "abuse_score": 92, "severity": "critical", "case_number": "MS-2026-00003"},
        {"ip": "91.234.56.78", "country": "Romania", "city": "Bucharest", "lat": 44.4323, "lng": 26.1063, "abuse_score": 68, "severity": "medium", "case_number": "MS-2026-00004"},
        {"ip": "209.85.221.54", "country": "United States", "city": "Mountain View", "lat": 37.3860, "lng": -122.0839, "abuse_score": 0, "severity": "low", "case_number": "MS-2026-00005"}
    ]
