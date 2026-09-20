import os
from app.services.email_parser import parse_eml

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_emails")

def test_parse_phishing_eml():
    eml_path = os.path.join(SAMPLE_DIR, "phishing_credential.eml")
    with open(eml_path, "rb") as f:
        content = f.read()

    parsed = parse_eml(content, filename="phishing_credential.eml")

    assert parsed.subject == "[URGENT] Your account has been compromised - Verify immediately"
    assert parsed.from_address == "security-alert@micros0ft-verify.com"
    assert parsed.from_display_name == "Microsoft Security Team"
    assert parsed.reply_to == "support@micros0ft-verify.com"
    assert parsed.return_path == "bounce@cheap-hosting-xyz.net"
    assert parsed.file_sha256 != ""
    assert len(parsed.received_chain) >= 2
    assert parsed.received_chain[0].ip == "185.234.72.19"

def test_parse_malware_eml():
    eml_path = os.path.join(SAMPLE_DIR, "malware_attachment.eml")
    with open(eml_path, "rb") as f:
        content = f.read()

    parsed = parse_eml(content, filename="malware_attachment.eml")

    assert len(parsed.attachments) == 1
    att = parsed.attachments[0]
    assert att.filename == "Invoice_INV-2026-8847.xlsm"
    assert att.is_macro_enabled is True
    assert att.sha256_hash != ""
