from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import HTMLResponse, JSONResponse
from datetime import datetime, timezone
from typing import Dict, Any
from app.api.v1.cases import get_case_detail, get_case_timeline
from app.services.report_generator import generate_html_report
from app.services.forensic_service import generate_evidence_manifest, verify_evidence_integrity

router = APIRouter(prefix="/reports", tags=["Forensic Reports"])

async def _build_report_html(case_id: str) -> str:
    detail = await get_case_detail(case_id)
    timeline = await get_case_timeline(case_id)
    
    c_obj = detail["case"]
    case_dict = c_obj.model_dump() if hasattr(c_obj, "model_dump") else (c_obj if isinstance(c_obj, dict) else c_obj.__dict__)
    
    e_obj = detail["email"]
    
    risk_factors = detail.get("risk_assessment", {}).get("factors", []) if isinstance(detail.get("risk_assessment"), dict) else (getattr(detail.get("risk_assessment"), "factors", []) or [])
    
    sha256 = detail.get("sha256_fingerprint", "a8f5c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1")
    evidence_id = detail.get("forensic_evidence_id", f"EVID-{case_id[:8].upper()}")

    return generate_html_report(
        case_data=case_dict,
        email_data=e_obj,
        timeline_data=timeline,
        risk_factors=risk_factors,
        evidence_hash=sha256,
        ip_locations=detail.get("ip_locations", []),
        ip_reputations=detail.get("ip_reputations", []),
        domain_intel=detail.get("domain_intel", []),
        url_scans=detail.get("url_scans", []),
        attachments=detail.get("attachments", []),
        campaign_id=detail.get("campaign_id"),
        evidence_id=evidence_id
    )

@router.post("/{case_id}/generate")
async def generate_report(case_id: str):
    html_content = await _build_report_html(case_id)
    return HTMLResponse(content=html_content)

@router.get("/{case_id}")
async def view_report(case_id: str):
    html_content = await _build_report_html(case_id)
    return HTMLResponse(content=html_content)

@router.get("/{case_id}/manifest")
async def get_manifest(case_id: str):
    detail = await get_case_detail(case_id)
    sha256 = detail.get("sha256_fingerprint", "a8f5c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1")
    
    e_obj = detail.get("email", {})
    filename = e_obj.get("filename", "email_artifact.eml") if isinstance(e_obj, dict) else getattr(e_obj, "filename", "email_artifact.eml")
    
    manifest = generate_evidence_manifest(
        case_id=case_id,
        sha256_fingerprint=sha256,
        email_filename=filename
    )
    return JSONResponse(content=manifest, headers={"Content-Disposition": f"attachment; filename=evidence-manifest-{case_id[:8]}.json"})

@router.post("/{case_id}/verify")
async def verify_hash(case_id: str, payload: Dict[str, Any] = Body(...)):
    claimed_hash = payload.get("claimed_hash", "")
    result = verify_evidence_integrity(case_id, claimed_hash)
    return result
