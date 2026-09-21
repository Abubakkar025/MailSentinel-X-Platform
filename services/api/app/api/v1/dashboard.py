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
    baseline = [
        {"ip": "185.234.72.19", "country": "Russia", "city": "Moscow", "lat": 55.7558, "lng": 37.6173, "abuse_score": 88, "severity": "critical", "case_number": "MS-2026-00001", "is_demo": True},
        {"ip": "103.45.67.89", "country": "Vietnam", "city": "Hanoi", "lat": 21.0285, "lng": 105.8542, "abuse_score": 74, "severity": "high", "case_number": "MS-2026-00002", "is_demo": True},
        {"ip": "45.133.1.87", "country": "Netherlands", "city": "Amsterdam", "lat": 52.3676, "lng": 4.9041, "abuse_score": 92, "severity": "critical", "case_number": "MS-2026-00003", "is_demo": True},
        {"ip": "91.234.56.78", "country": "Romania", "city": "Bucharest", "lat": 44.4323, "lng": 26.1063, "abuse_score": 68, "severity": "medium", "case_number": "MS-2026-00004", "is_demo": True},
        {"ip": "209.85.221.54", "country": "United States", "city": "Mountain View", "lat": 37.3860, "lng": -122.0839, "abuse_score": 0, "severity": "low", "case_number": "MS-2026-00005", "is_demo": True}
    ]
    threats = list(baseline)
    by_ip = {t["ip"]: t for t in threats}

    # Merge geolocated indicators from real investigations so new EML
    # uploads appear on the Threat Map. Only valid coordinates are used;
    # missing/invalid geolocation is never fabricated.
    try:
        from app.api.v1.investigate import MEM_INVESTIGATED_CASES
    except Exception:
        MEM_INVESTIGATED_CASES = {}

    def _field(obj: Any, name: str, default: Any = None) -> Any:
        if isinstance(obj, dict):
            return obj.get(name, default)
        return getattr(obj, name, default)

    def _valid_coords(lat: Any, lng: Any) -> bool:
        try:
            lat_f, lng_f = float(lat), float(lng)
        except (TypeError, ValueError):
            return False
        if lat_f == 0 and lng_f == 0:
            return False
        return -90 <= lat_f <= 90 and -180 <= lng_f <= 180

    for record in MEM_INVESTIGATED_CASES.values():
        case = record.get("case") if isinstance(record, dict) else None
        rep_by_ip = {}
        for rep in (record.get("ip_reputations", []) if isinstance(record, dict) else []):
            rep_by_ip[_field(rep, "ip_address")] = rep
        for loc in (record.get("ip_locations", []) if isinstance(record, dict) else []):
            ip = _field(loc, "ip_address")
            lat = _field(loc, "latitude")
            lng = _field(loc, "longitude")
            if not ip or _field(loc, "is_private", False):
                continue
            if not _valid_coords(lat, lng):
                continue
            rep = rep_by_ip.get(ip)
            abuse = int(_field(rep, "abuse_score", 0) or 0) if rep is not None else 0
            severity = _field(case, "severity", "medium") if case is not None else "medium"
            entry = {
                "ip": ip,
                "country": _field(loc, "country", "Unknown") or "Unknown",
                "city": _field(loc, "city", "Unknown") or "Unknown",
                "lat": float(lat),
                "lng": float(lng),
                "abuse_score": abuse,
                "severity": severity,
                "case_number": _field(case, "case_number", "") if case is not None else "",
                "is_demo": bool(_field(case, "is_demo", False)) if case is not None else False,
            }
            existing = by_ip.get(ip)
            if existing is None:
                threats.append(entry)
                by_ip[ip] = entry
            elif existing.get("is_demo") and not entry["is_demo"]:
                # A real investigation supersedes the demo baseline for the same IP.
                threats[threats.index(existing)] = entry
                by_ip[ip] = entry

    return threats
