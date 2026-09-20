import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Dict, Any

from app.schemas.investigation import InvestigationResult, RiskScoreResponse
from app.schemas.case import CaseResponse
from app.services.email_parser import parse_eml
from app.services.auth_analyzer import analyze_auth
from app.services.risk_engine import calculate_risk
from app.services.threat_intel import check_ip_reputation, check_url, check_domain
from app.services.geolocation import geolocate_ip
from app.services.campaign_engine import correlate_campaign
from app.services.forensic_service import log_forensic_event
from app.utils.ip_extractor import extract_ips, filter_public_ips
from app.utils.url_extractor import extract_urls
from app.utils.domain_utils import extract_domain
from app.services.demo_data import DEMO_CASES

router = APIRouter(prefix="/investigate", tags=["Investigation Pipeline"])

# In-memory case index for standalone execution
MEM_INVESTIGATED_CASES: Dict[str, Dict[str, Any]] = {}

@router.post("/upload", response_model=InvestigationResult)
async def upload_and_analyze_eml(file: UploadFile = File(...)):
    """
    Core Email Investigation Pipeline:
    Upload .eml -> parse RFC 5322 -> extract headers/IPs/domains/URLs/attachments ->
    analyze authentication -> TI lookups -> IP Geolocation -> explainable risk score ->
    campaign correlation -> digital forensics evidence chain -> return investigation result.
    """
    if not file.filename.endswith(".eml") and not file.filename.endswith(".msg") and file.content_type not in ["message/rfc822", "application/octet-stream"]:
        # Flexible for hackathon demo uploads
        pass

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")

    case_id = str(uuid.uuid4())
    case_number = f"MS-2026-{str(len(MEM_INVESTIGATED_CASES) + len(DEMO_CASES) + 1).zfill(5)}"

    # 1. Digital Forensics: Log Evidence Received Event & Hash
    ev_received = log_forensic_event(
        case_id=case_id,
        event_type="file_received",
        actor="system",
        details={"filename": file.filename, "size_bytes": len(content)},
        evidence_hash=""
    )

    # 2. Parse RFC 5322 Email
    parsed_email = parse_eml(content, filename=file.filename)
    ev_received["evidence_hash"] = parsed_email.file_sha256

    log_forensic_event(
        case_id=case_id,
        event_type="headers_parsed",
        actor="system",
        details={"subject": parsed_email.subject, "from": parsed_email.from_address},
        evidence_hash=parsed_email.file_sha256
    )

    # 3. Analyze Authentication Results
    auth_res = analyze_auth(parsed_email.auth_results.auth_header_raw)
    parsed_email.auth_results = auth_res

    log_forensic_event(
        case_id=case_id,
        event_type="auth_analyzed",
        actor="system",
        details={"spf": auth_res.spf_result, "dkim": auth_res.dkim_result, "dmarc": auth_res.dmarc_result},
        evidence_hash=parsed_email.file_sha256
    )

    # 4. Extract Public IPs, Domains, URLs
    all_ips = []
    for hop in parsed_email.received_chain:
        if hop.ip:
            all_ips.append(hop.ip)
    # Also extract IPs from headers/body
    all_ips.extend(extract_ips(parsed_email.raw_headers))
    public_ips = filter_public_ips(list(set(all_ips)))

    extracted_urls = extract_urls(parsed_email.body_text, parsed_email.body_html)

    extracted_domains = set()
    if parsed_email.from_address:
        extracted_domains.add(extract_domain(parsed_email.from_address))
    if parsed_email.reply_to:
        extracted_domains.add(extract_domain(parsed_email.reply_to))
    for u in extracted_urls:
        if u.get("domain"):
            extracted_domains.add(u["domain"])

    # 5. Geolocation & Threat Intelligence Lookups
    geo_locations = []
    ip_reputations = []
    for ip in public_ips[:5]: # Cap at top 5 IPs
        geo = await geolocate_ip(ip)
        rep = await check_ip_reputation(ip)
        geo_locations.append(geo)
        ip_reputations.append(rep)

    url_scans = []
    for u in extracted_urls[:5]: # Cap at top 5 URLs
        scan = await check_url(u["url"], display_text=u.get("display_text"))
        url_scans.append(scan)

    domain_intel_list = []
    for d in list(extracted_domains)[:5]:
        d_intel = await check_domain(d)
        domain_intel_list.append(d_intel)

    log_forensic_event(
        case_id=case_id,
        event_type="threat_intel_completed",
        actor="system",
        details={"public_ips_scanned": len(public_ips), "urls_scanned": len(url_scans)},
        evidence_hash=parsed_email.file_sha256
    )

    # 6. Calculate Explainable Risk Score
    risk_assessment = calculate_risk(
        email=parsed_email,
        auth_results=auth_res,
        ip_reputations=[r.model_dump() for r in ip_reputations],
        url_scans=[u.model_dump() for u in url_scans],
        domain_intel=[d.model_dump() for d in domain_intel_list]
    )

    log_forensic_event(
        case_id=case_id,
        event_type="risk_scored",
        actor="system",
        details={"score": risk_assessment.score, "severity": risk_assessment.severity, "threat_type": risk_assessment.threat_type},
        evidence_hash=parsed_email.file_sha256
    )

    # 7. Campaign Correlation
    attachment_hashes = [a.sha256_hash for a in parsed_email.attachments]
    campaign = await correlate_campaign(
        ip_addresses=public_ips,
        domains=list(extracted_domains),
        urls=[u["url"] for u in extracted_urls],
        attachment_hashes=attachment_hashes,
        from_address=parsed_email.from_address or ""
    )

    campaign_id = campaign.get("id") if campaign else None

    # 8. Create Case Record
    created_now = datetime.now(timezone.utc).isoformat()
    case_title = f"{risk_assessment.threat_type.title()} Threat - {parsed_email.subject or 'No Subject'}"

    case_obj = CaseResponse(
        id=case_id,
        case_number=case_number,
        title=case_title,
        status="investigating",
        severity=risk_assessment.severity,
        threat_type=risk_assessment.threat_type,
        risk_score=risk_assessment.score,
        risk_factors=[f.model_dump() for f in risk_assessment.factors],
        verdict=f"Automated Risk Verdict: {risk_assessment.severity.upper()} ({risk_assessment.threat_type})",
        assigned_to="analyst@company.com",
        created_by="analyst@company.com",
        campaign_id=campaign_id,
        is_demo=False,
        created_at=created_now,
        updated_at=created_now
    )

    full_case_record = {
        "case": case_obj,
        "email": parsed_email,
        "risk_assessment": risk_assessment,
        "ip_locations": geo_locations,
        "ip_reputations": ip_reputations,
        "domain_intel": domain_intel_list,
        "url_scans": url_scans,
        "attachments": parsed_email.attachments,
        "campaign_id": campaign_id,
        "forensic_evidence_id": f"EVID-{case_id[:8].upper()}",
        "sha256_fingerprint": parsed_email.file_sha256
    }

    MEM_INVESTIGATED_CASES[case_id] = full_case_record

    return InvestigationResult(**full_case_record)

@router.get("/{case_id}/status")
async def get_pipeline_status(case_id: str):
    if case_id in MEM_INVESTIGATED_CASES:
        return {"case_id": case_id, "status": "complete", "progress_pct": 100, "message": "Analysis completed successfully."}
    return {"case_id": case_id, "status": "queued", "progress_pct": 0, "message": "Processing..."}
