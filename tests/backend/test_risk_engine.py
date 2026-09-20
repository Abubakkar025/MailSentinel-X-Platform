import os
from app.services.email_parser import parse_eml
from app.services.auth_analyzer import analyze_auth
from app.services.risk_engine import calculate_risk

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_emails")

def test_risk_score_benign():
    eml_path = os.path.join(SAMPLE_DIR, "benign_newsletter.eml")
    with open(eml_path, "rb") as f:
        parsed = parse_eml(f.read())

    auth_res = analyze_auth(parsed.auth_results.auth_header_raw)
    risk = calculate_risk(parsed, auth_res)

    assert risk.score < 26
    assert risk.severity == "low"
    assert risk.threat_type == "benign"

def test_risk_score_phishing():
    eml_path = os.path.join(SAMPLE_DIR, "phishing_credential.eml")
    with open(eml_path, "rb") as f:
        parsed = parse_eml(f.read())

    auth_res = analyze_auth(parsed.auth_results.auth_header_raw)
    url_scans = [{"url": "http://185.234.72.19/microsoft-verify/login.php", "is_shortened": False}]
    risk = calculate_risk(parsed, auth_res, url_scans=url_scans)

    assert risk.score >= 51
    assert risk.severity in ["high", "critical"]
    assert len(risk.factors) > 0

def test_risk_score_malware():
    eml_path = os.path.join(SAMPLE_DIR, "malware_attachment.eml")
    with open(eml_path, "rb") as f:
        parsed = parse_eml(f.read())

    auth_res = analyze_auth(parsed.auth_results.auth_header_raw)
    risk = calculate_risk(parsed, auth_res)

    assert risk.score >= 76
    assert risk.severity == "critical"
    assert risk.threat_type == "malware"
