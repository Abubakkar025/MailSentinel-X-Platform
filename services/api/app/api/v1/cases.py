from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from app.schemas.case import CaseResponse, CaseListResponse, CaseUpdate
from app.services.demo_data import get_demo_cases, DEMO_CASES
from app.api.v1.investigate import MEM_INVESTIGATED_CASES
from app.services.forensic_service import get_forensic_timeline

router = APIRouter(prefix="/cases", tags=["Cases Management"])

def get_all_active_cases() -> List[Dict[str, Any]]:
    combined = []
    for case_id, record in MEM_INVESTIGATED_CASES.items():
        case_data = record["case"].model_dump() if hasattr(record["case"], "model_dump") else record["case"]
        combined.append(case_data)
    for d_case in DEMO_CASES:
        if not any(c.get("id") == d_case["id"] for c in combined):
            combined.append(d_case)
    return combined

@router.get("", response_model=CaseListResponse)
async def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    threat_type: Optional[str] = None,
    search: Optional[str] = None
):
    cases = get_all_active_cases()

    if status:
        cases = [c for c in cases if c.get("status") == status]
    if severity:
        cases = [c for c in cases if c.get("severity") == severity]
    if threat_type:
        cases = [c for c in cases if c.get("threat_type") == threat_type]
    if search:
        s_lower = search.lower()
        cases = [c for c in cases if s_lower in c.get("title", "").lower() or s_lower in c.get("case_number", "").lower()]

    total = len(cases)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated = cases[start_idx:end_idx]

    return CaseListResponse(
        items=[CaseResponse(**c) if isinstance(c, dict) else c for c in paginated],
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/{id}")
async def get_case_detail(id: str):
    if id in MEM_INVESTIGATED_CASES:
        return MEM_INVESTIGATED_CASES[id]

    for d_case in DEMO_CASES:
        if d_case["id"] == id:
            return {
                "case": CaseResponse(**d_case),
                "email": d_case["email"],
                "risk_assessment": {"score": d_case["risk_score"], "severity": d_case["severity"], "threat_type": d_case["threat_type"], "factors": []},
                "ip_locations": [{"ip_address": d_case["indicators"]["ips"][0], "country": "Russia", "city": "Moscow", "latitude": 55.75, "longitude": 37.61, "asn": "AS202425"}] if d_case["indicators"]["ips"] else [],
                "ip_reputations": [{"ip_address": d_case["indicators"]["ips"][0], "abuse_score": 85, "is_malicious": True}] if d_case["indicators"]["ips"] else [],
                "domain_intel": [{"domain_name": "micros0ft-verify.com", "age_days": 12, "is_newly_registered": True, "is_suspicious": True}],
                "url_scans": [{"url": "http://185.234.72.19/login.php", "display_text": "Verify Microsoft Account", "domain": "185.234.72.19", "is_malicious": True, "detection_count": 42, "total_engines": 92}],
                "attachments": d_case["indicators"].get("attachments", []),
                "campaign_id": d_case.get("campaign_id"),
                "forensic_evidence_id": f"EVID-{id[:8].upper()}",
                "sha256_fingerprint": d_case["email"].get("file_sha256", "a8f5c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1")
            }

    raise HTTPException(status_code=404, detail="Case not found")

@router.patch("/{id}", response_model=CaseResponse)
async def update_case(id: str, case_update: CaseUpdate):
    target_case = None
    if id in MEM_INVESTIGATED_CASES:
        target_case = MEM_INVESTIGATED_CASES[id]["case"]
    else:
        for d in DEMO_CASES:
            if d["id"] == id:
                target_case = d
                break

    if not target_case:
        raise HTTPException(status_code=404, detail="Case not found")

    update_dict = case_update.model_dump(exclude_unset=True)
    if isinstance(target_case, dict):
        for k, v in update_dict.items():
            if v is not None:
                target_case[k] = v
        return CaseResponse(**target_case)
    else:
        for k, v in update_dict.items():
            if v is not None:
                setattr(target_case, k, v)
        return target_case

@router.get("/{id}/timeline")
async def get_case_timeline(id: str):
    timeline = get_forensic_timeline(id)
    if not timeline:
        return [
            {"created_at": "2026-09-17T08:30:00Z", "event_type": "file_received", "actor": "system", "details": {"filename": "phishing_credential.eml"}, "evidence_hash": "a8f5c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1"},
            {"created_at": "2026-09-17T08:30:02Z", "event_type": "headers_parsed", "actor": "system", "details": {"subject": "[URGENT] Account Compromised"}, "evidence_hash": "a8f5c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1"},
            {"created_at": "2026-09-17T08:30:05Z", "event_type": "auth_analyzed", "actor": "system", "details": {"spf": "fail", "dkim": "fail", "dmarc": "fail"}, "evidence_hash": "a8f5c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1"},
            {"created_at": "2026-09-17T08:30:10Z", "event_type": "threat_intel_completed", "actor": "system", "details": {"abuse_score": 94}, "evidence_hash": "a8f5c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1"},
            {"created_at": "2026-09-17T08:30:15Z", "event_type": "risk_scored", "actor": "system", "details": {"score": 94, "severity": "critical"}, "evidence_hash": "a8f5c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1"}
        ]
    return timeline

@router.get("/{id}/graph")
async def get_case_graph(id: str):
    detail = await get_case_detail(id)
    c = detail["case"]
    e = detail["email"]
    
    score = getattr(c, "risk_score", c.get("risk_score", 50) if isinstance(c, dict) else 50)
    subject = e.get("subject", "Email Artifact") if isinstance(e, dict) else getattr(e, "subject", "Email Artifact")
    from_addr = e.get("from_address", "") if isinstance(e, dict) else getattr(e, "from_address", "")

    nodes = [
        {
            "id": "email-node",
            "type": "emailNode",
            "position": {"x": 250, "y": 40},
            "data": {"label": subject, "from": from_addr, "score": score}
        }
    ]
    edges = []

    # IP nodes
    ip_locs = detail.get("ip_locations", [])
    ip_reps = detail.get("ip_reputations", [])
    rep_map = {r.get("ip_address"): r.get("abuse_score", 0) for r in ip_reps if isinstance(r, dict)}

    for idx, loc in enumerate(ip_locs):
        ip_addr = loc.get("ip_address") if isinstance(loc, dict) else getattr(loc, "ip_address", "")
        country = loc.get("country") if isinstance(loc, dict) else getattr(loc, "country", "")
        ip_id = f"ip-{idx}"
        nodes.append({
            "id": ip_id,
            "type": "ipNode",
            "position": {"x": 40 + (idx * 230), "y": 180},
            "data": {
                "label": ip_addr,
                "country": country,
                "abuse_score": rep_map.get(ip_addr, 65 if idx==0 else 10)
            }
        })
        edges.append({
            "id": f"e-email-{ip_id}",
            "source": "email-node",
            "target": ip_id,
            "label": "sent from relay",
            "animated": True,
            "style": {"stroke": "#ef4444" if rep_map.get(ip_addr, 0) > 25 else "#10b981"}
        })

    # Domain nodes
    domains = detail.get("domain_intel", [])
    for idx, d in enumerate(domains):
        d_name = d.get("domain_name") if isinstance(d, dict) else getattr(d, "domain_name", "")
        dom_id = f"dom-{idx}"
        nodes.append({
            "id": dom_id,
            "type": "domainNode",
            "position": {"x": 500 + (idx * 230), "y": 180},
            "data": {
                "label": d_name,
                "age_days": d.get("age_days", 15) if isinstance(d, dict) else getattr(d, "age_days", 15),
                "is_suspicious": d.get("is_suspicious", True) if isinstance(d, dict) else getattr(d, "is_suspicious", True)
            }
        })
        edges.append({
            "id": f"e-email-{dom_id}",
            "source": "email-node",
            "target": dom_id,
            "label": "uses domain",
            "style": {"stroke": "#06b6d4"}
        })

    # URL nodes
    urls = detail.get("url_scans", [])
    for idx, u in enumerate(urls):
        url_id = f"url-{idx}"
        u_str = u.get("url") if isinstance(u, dict) else getattr(u, "url", "")
        u_dom = u.get("domain") if isinstance(u, dict) else getattr(u, "domain", "")
        is_mal = u.get("is_malicious") if isinstance(u, dict) else getattr(u, "is_malicious", False)
        dets = u.get("detection_count", 0) if isinstance(u, dict) else getattr(u, "detection_count", 0)
        
        nodes.append({
            "id": url_id,
            "type": "urlNode",
            "position": {"x": 60 + (idx * 240), "y": 340},
            "data": {
                "label": u_str,
                "domain": u_dom,
                "is_malicious": is_mal,
                "detections": dets,
                "engines": 92
            }
        })
        edges.append({
            "id": f"e-email-{url_id}",
            "source": "email-node",
            "target": url_id,
            "label": "contains hyperlink",
            "animated": is_mal,
            "style": {"stroke": "#f59e0b" if not is_mal else "#ef4444"}
        })

    # Attachment nodes
    atts = detail.get("attachments", [])
    for idx, a in enumerate(atts):
        att_id = f"att-{idx}"
        fname = a.get("filename") if isinstance(a, dict) else getattr(a, "filename", "attachment")
        fhash = a.get("sha256_hash", "") if isinstance(a, dict) else getattr(a, "sha256_hash", "")
        is_exec = a.get("is_executable", False) if isinstance(a, dict) else getattr(a, "is_executable", False)
        is_macro = a.get("is_macro_enabled", False) if isinstance(a, dict) else getattr(a, "is_macro_enabled", False)
        
        nodes.append({
            "id": att_id,
            "type": "attachmentNode",
            "position": {"x": 520 + (idx * 240), "y": 340},
            "data": {
                "label": fname,
                "hash": fhash,
                "is_executable": is_exec,
                "is_macro": is_macro
            }
        })
        edges.append({
            "id": f"e-email-{att_id}",
            "source": "email-node",
            "target": att_id,
            "label": "attaches file",
            "style": {"stroke": "#a855f7"}
        })

    # Campaign node
    camp_id = getattr(c, "campaign_id", None) if not isinstance(c, dict) else c.get("campaign_id")
    if not camp_id:
        camp_id = detail.get("campaign_id")

    if camp_id:
        nodes.append({
            "id": "campaign-node",
            "type": "campaignNode",
            "position": {"x": 280, "y": 490},
            "data": {"label": f"Campaign Cluster #{camp_id}", "id": camp_id}
        })
        edges.append({
            "id": "e-email-campaign",
            "source": "email-node",
            "target": "campaign-node",
            "label": "correlated to campaign",
            "animated": True,
            "style": {"stroke": "#8b5cf6", "strokeWidth": 2}
        })

    return {"nodes": nodes, "edges": edges}
