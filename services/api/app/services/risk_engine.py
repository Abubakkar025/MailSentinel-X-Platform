import re
from typing import List, Dict, Any
from app.schemas.email import EmailParsed, AuthResults
from app.schemas.case import RiskFactor
from app.schemas.investigation import RiskScoreResponse
from app.utils.domain_utils import extract_domain, is_free_email_provider, check_typosquatting

URGENCY_KEYWORDS = ['urgent', 'immediately', 'verify', 'suspended', '24 hours', 'action required', 'compromised', 'overdue', 'wire transfer', 'confidential']
FINANCIAL_KEYWORDS = ['wire transfer', 'invoice', 'payment', 'direct deposit', 'bank account', 'salary', 'routing number', 'acquisition']
AUTHORITY_KEYWORDS = ['ceo', 'cfo', 'hr', 'board meeting', 'chief executive officer', 'president', 'security team']

def calculate_risk(
    email: EmailParsed,
    auth_results: AuthResults,
    ip_reputations: List[Dict[str, Any]] = None,
    url_scans: List[Dict[str, Any]] = None,
    domain_intel: List[Dict[str, Any]] = None
) -> RiskScoreResponse:
    """
    Calculate an explainable 0-100 risk score with detailed evidence factors.
    Categorized into: Auth, Header, Domain, URL, IP, Attachment, Content.
    """
    factors: List[RiskFactor] = []
    total_score = 0

    # ----------------------------------------------------
    # 1. AUTHENTICATION FAILURES (Max 45 points)
    # ----------------------------------------------------
    if auth_results.spf_result in ['fail', 'softfail']:
        pts = 15 if auth_results.spf_result == 'fail' else 10
        total_score += pts
        factors.append(RiskFactor(
            name="SPF Authentication Failure",
            points=pts,
            max_points=15,
            evidence=f"SPF status is '{auth_results.spf_result}'. Sending IP is not authorized for domain.",
            triggered=True,
            category="auth"
        ))

    if auth_results.dkim_result in ['fail', 'none']:
        pts = 15 if auth_results.dkim_result == 'fail' else 8
        total_score += pts
        factors.append(RiskFactor(
            name="DKIM Cryptographic Signature Failure",
            points=pts,
            max_points=15,
            evidence=f"DKIM signature is '{auth_results.dkim_result}'. Message headers/body may be tampered with.",
            triggered=True,
            category="auth"
        ))

    if auth_results.dmarc_result in ['fail', 'none']:
        pts = 15 if auth_results.dmarc_result == 'fail' else 8
        total_score += pts
        factors.append(RiskFactor(
            name="DMARC Policy Failure",
            points=pts,
            max_points=15,
            evidence=f"DMARC status is '{auth_results.dmarc_result}'. Unaligned authentication.",
            triggered=True,
            category="auth"
        ))

    # ----------------------------------------------------
    # 2. HEADER ANOMALIES (Max 25 points)
    # ----------------------------------------------------
    from_dom = extract_domain(email.from_address or "")
    return_dom = extract_domain(email.return_path or "") if email.return_path else from_dom
    reply_dom = extract_domain(email.reply_to or "") if email.reply_to else from_dom

    if from_dom and return_dom and from_dom != return_dom:
        total_score += 10
        factors.append(RiskFactor(
            name="Envelope Return-Path Mismatch",
            points=10,
            max_points=10,
            evidence=f"From domain ({from_dom}) does not match Return-Path domain ({return_dom}).",
            triggered=True,
            category="header"
        ))

    if from_dom and reply_dom and from_dom != reply_dom:
        total_score += 10
        factors.append(RiskFactor(
            name="Reply-To Routing Mismatch",
            points=10,
            max_points=10,
            evidence=f"From domain ({from_dom}) differs from Reply-To address domain ({reply_dom}). Typical of BEC.",
            triggered=True,
            category="header"
        ))

    if not email.message_id:
        total_score += 5
        factors.append(RiskFactor(
            name="Missing RFC Message-ID",
            points=5,
            max_points=5,
            evidence="Email is missing standard Message-ID header, indicative of spam tools.",
            triggered=True,
            category="header"
        ))

    # ----------------------------------------------------
    # 3. DOMAIN IMPERSONATION & AGE (Max 25 points)
    # ----------------------------------------------------
    is_typo, target_brand, dist = check_typosquatting(from_dom)
    if is_typo:
        total_score += 15
        factors.append(RiskFactor(
            name="Domain Impersonation / Typosquatting",
            points=15,
            max_points=15,
            evidence=f"Domain '{from_dom}' appears to typosquat target brand '{target_brand}'.",
            triggered=True,
            category="domain"
        ))

    if is_free_email_provider(from_dom) and (email.from_display_name or "CEO" in (email.subject or "").upper()):
        total_score += 8
        factors.append(RiskFactor(
            name="Free Webmail Used for Corporate Context",
            points=8,
            max_points=8,
            evidence=f"Free email provider ({from_dom}) used with executive/corporate display name.",
            triggered=True,
            category="domain"
        ))

    # ----------------------------------------------------
    # 4. URL INDICATORS (Max 25 points)
    # ----------------------------------------------------
    if url_scans:
        for u in url_scans:
            if u.get("is_shortened"):
                total_score += 5
                factors.append(RiskFactor(
                    name="URL Shortener Detected",
                    points=5,
                    max_points=5,
                    evidence=f"URL shortener obfuscation found: {u.get('url')}",
                    triggered=True,
                    category="url"
                ))
                break

        for u in url_scans:
            url_str = u.get("url", "")
            if re.search(r'http://[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}', url_str):
                total_score += 10
                factors.append(RiskFactor(
                    name="IP-Based Raw URL",
                    points=10,
                    max_points=10,
                    evidence=f"Direct IP URL detected (no domain name): {url_str}",
                    triggered=True,
                    category="url"
                ))
                break

    # ----------------------------------------------------
    # 5. ATTACHMENT RISK (Max 30 points)
    # ----------------------------------------------------
    for att in email.attachments:
        if att.is_executable or att.has_double_extension:
            total_score += 20
            factors.append(RiskFactor(
                name="High Risk Executable Attachment",
                points=20,
                max_points=20,
                evidence=f"Executable attachment detected: {att.filename}",
                triggered=True,
                category="attachment"
            ))
            break
        elif att.is_macro_enabled:
            total_score += 15
            factors.append(RiskFactor(
                name="Macro-Enabled Document Attachment",
                points=15,
                max_points=15,
                evidence=f"Macro-enabled document attachment: {att.filename}",
                triggered=True,
                category="attachment"
            ))
            break

    # ----------------------------------------------------
    # 6. CONTENT / SOCIAL ENGINEERING (Max 20 points)
    # ----------------------------------------------------
    text_content = f"{email.subject or ''} {email.body_text or ''}".lower()

    found_urgency = [w for w in URGENCY_KEYWORDS if w in text_content]
    if found_urgency:
        total_score += 8
        factors.append(RiskFactor(
            name="Urgency & Pressure Language",
            points=8,
            max_points=8,
            evidence=f"Urgent keywords found: {', '.join(found_urgency[:3])}",
            triggered=True,
            category="content"
        ))

    found_fin = [w for w in FINANCIAL_KEYWORDS if w in text_content]
    if found_fin:
        total_score += 8
        factors.append(RiskFactor(
            name="Financial Request & Payment Telemetry",
            points=8,
            max_points=8,
            evidence=f"Financial keywords found: {', '.join(found_fin[:3])}",
            triggered=True,
            category="content"
        ))

    # Cap score at 100
    final_score = min(100, max(0, total_score))

    # Determine severity band
    if final_score >= 76:
        severity = "critical"
    elif final_score >= 51:
        severity = "high"
    elif final_score >= 26:
        severity = "medium"
    else:
        severity = "low"

    # Determine threat classification
    threat_type = "benign"
    if final_score >= 26:
        if any(f.name == "High Risk Executable Attachment" or f.name == "Macro-Enabled Document Attachment" for f in factors):
            threat_type = "malware"
        elif any(f.name == "Reply-To Routing Mismatch" or f.name == "Free Webmail Used for Corporate Context" for f in factors) and found_fin:
            threat_type = "bec"
        elif any(f.name == "Domain Impersonation / Typosquatting" for f in factors):
            threat_type = "spoofing"
        elif any(f.name == "IP-Based Raw URL" for f in factors) or "verify" in text_content or "login" in text_content:
            threat_type = "credential_harvesting" if "login" in text_content or "password" in text_content else "phishing"
        else:
            threat_type = "phishing"

    return RiskScoreResponse(
        score=final_score,
        severity=severity,
        threat_type=threat_type,
        factors=factors
    )
