import uuid
from typing import Dict, Any, List

DEMO_CASES: List[Dict[str, Any]] = [
    {
        "id": "case-001",
        "case_number": "MS-2026-00001",
        "title": "Microsoft 365 Credential Harvesting Phishing Campaign",
        "status": "investigating",
        "severity": "critical",
        "threat_type": "phishing / bec",
        "risk_score": 94,
        "verdict": "Confirmed Malicious - Credential Harvesting Phish",
        "assigned_to": "analyst@company.com",
        "created_by": "analyst@company.com",
        "campaign_id": "camp-001",
        "is_demo": True,
        "created_at": "2026-09-17T08:30:00Z",
        "updated_at": "2026-09-17T08:35:00Z",
        "email": {
            "subject": "[URGENT] Your account has been compromised - Verify immediately",
            "from_address": "security-alert@micros0ft-verify.com",
            "from_display_name": "Microsoft Security Team",
            "to_addresses": ["analyst@company.com"],
            "reply_to": "support@micros0ft-verify.com",
            "return_path": "bounce@cheap-hosting-xyz.net",
            "message_id": "<phish-001-sept2026@micros0ft-verify.com>",
            "date_sent": "Mon, 15 Sep 2026 03:22:14 +0000",
            "spf_result": "fail",
            "dkim_result": "fail",
            "dmarc_result": "fail",
            "x_mailer": "PHPMailer 5.2.1",
            "file_sha256": "a8f5c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
            "original_filename": "phishing_credential.eml"
        },
        "indicators": {
            "ips": ["185.234.72.19"],
            "domains": ["micros0ft-verify.com", "cheap-hosting-xyz.net"],
            "urls": ["http://185.234.72.19/microsoft-verify/login.php?session=abc123"],
            "attachments": []
        }
    },
    {
        "id": "case-002",
        "case_number": "MS-2026-00002",
        "title": "Executive Impersonation Wire Transfer BEC",
        "status": "open",
        "severity": "high",
        "threat_type": "bec",
        "risk_score": 74,
        "verdict": "Confirmed BEC Attempt - Financial Fraud",
        "assigned_to": "analyst@company.com",
        "created_by": "analyst@company.com",
        "campaign_id": "camp-002",
        "is_demo": True,
        "created_at": "2026-09-17T07:15:00Z",
        "updated_at": "2026-09-17T07:20:00Z",
        "email": {
            "subject": "Urgent Wire Transfer Required - Confidential",
            "from_address": "r.chen@company-financial.net",
            "from_display_name": "Robert Chen - CFO",
            "to_addresses": ["accounting@company.com"],
            "reply_to": "robert.chen.private@gmail.com",
            "return_path": "r.chen@company-financial.net",
            "message_id": "<bec-wire-20260912@company-financial.net>",
            "date_sent": "Fri, 12 Sep 2026 16:45:00 -0400",
            "spf_result": "softfail",
            "dkim_result": "none",
            "dmarc_result": "fail",
            "x_mailer": "Thunderbird 115.0",
            "file_sha256": "b9e6d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
            "original_filename": "bec_wire_transfer.eml"
        },
        "indicators": {
            "ips": ["103.45.67.89"],
            "domains": ["company-financial.net", "gmail.com"],
            "urls": [],
            "attachments": []
        }
    },
    {
        "id": "case-003",
        "case_number": "MS-2026-00003",
        "title": "DocuSign Brand Spoofing with Macro Excel Payload",
        "status": "investigating",
        "severity": "critical",
        "threat_type": "malware",
        "risk_score": 92,
        "verdict": "Confirmed Malware Delivery Payload",
        "assigned_to": "analyst@company.com",
        "created_by": "analyst@company.com",
        "campaign_id": None,
        "is_demo": True,
        "created_at": "2026-09-16T14:20:00Z",
        "updated_at": "2026-09-16T14:25:00Z",
        "email": {
            "subject": "Document Ready for Signature - Invoice #INV-2026-8847",
            "from_address": "noreply@docusign-notifications.net",
            "from_display_name": "DocuSign",
            "to_addresses": ["analyst@company.com"],
            "reply_to": "noreply@docusign-notifications.net",
            "return_path": "bounce@bulletproof-host.xyz",
            "message_id": "<malware-delivery-001@docusign-notifications.net>",
            "date_sent": "Thu, 11 Sep 2026 07:30:00 +0000",
            "spf_result": "fail",
            "dkim_result": "fail",
            "dmarc_result": "fail",
            "x_mailer": "Python/3.8 aiosmtpd",
            "file_sha256": "c0f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7",
            "original_filename": "malware_attachment.eml"
        },
        "indicators": {
            "ips": ["45.133.1.87"],
            "domains": ["docusign-notifications.net", "bulletproof-host.xyz"],
            "urls": ["http://45.133.1.87/docusign/review?token=malicious_payload_here"],
            "attachments": [
                {
                    "filename": "Invoice_INV-2026-8847.xlsm",
                    "content_type": "application/vnd.ms-excel.sheet.macroEnabled.12",
                    "file_size_bytes": 28400,
                    "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    "is_macro_enabled": True
                }
            ]
        }
    },
    {
        "id": "case-004",
        "case_number": "MS-2026-00004",
        "title": "CEO Direct PII Roster Harvesting",
        "status": "resolved",
        "severity": "medium",
        "threat_type": "spoofing",
        "risk_score": 68,
        "verdict": "High Risk Executive Spoofing",
        "assigned_to": "analyst@company.com",
        "created_by": "analyst@company.com",
        "campaign_id": None,
        "is_demo": True,
        "created_at": "2026-09-15T11:10:00Z",
        "updated_at": "2026-09-15T11:30:00Z",
        "email": {
            "subject": "Employee Information Request - Urgent",
            "from_address": "david.miller@company.com",
            "from_display_name": "David Miller - CEO",
            "to_addresses": ["hr@company.com"],
            "reply_to": "d.miller.ceo@protonmail.com",
            "return_path": "d.miller.ceo@protonmail.com",
            "message_id": "<impersonation-ceo-001@mail.attacker-server.ru>",
            "date_sent": "Wed, 10 Sep 2026 09:15:00 -0400",
            "spf_result": "fail",
            "dkim_result": "pass",
            "dmarc_result": "fail",
            "x_mailer": "RoundCube Webmail/1.6.0",
            "file_sha256": "d1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
            "original_filename": "impersonation_ceo.eml"
        },
        "indicators": {
            "ips": ["91.234.56.78"],
            "domains": ["company.com", "protonmail.com"],
            "urls": [],
            "attachments": []
        }
    },
    {
        "id": "case-005",
        "case_number": "MS-2026-00005",
        "title": "Legitimate Tech Digest Weekly Newsletter",
        "status": "closed",
        "severity": "low",
        "threat_type": "benign",
        "risk_score": 5,
        "verdict": "Benign Clean Email",
        "assigned_to": "analyst@company.com",
        "created_by": "analyst@company.com",
        "campaign_id": None,
        "is_demo": True,
        "created_at": "2026-09-15T10:05:00Z",
        "updated_at": "2026-09-15T10:05:00Z",
        "email": {
            "subject": "Weekly Tech Digest - September 2026",
            "from_address": "newsletter@techdigest.com",
            "from_display_name": "Tech Digest",
            "to_addresses": ["analyst@company.com"],
            "reply_to": "newsletter@techdigest.com",
            "return_path": "bounce@techdigest.com",
            "message_id": "<20260915100000.ABC123@techdigest.com>",
            "date_sent": "Mon, 15 Sep 2026 10:00:00 -0400",
            "spf_result": "pass",
            "dkim_result": "pass",
            "dmarc_result": "pass",
            "x_mailer": "MailChimp 6.0",
            "file_sha256": "e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3",
            "original_filename": "benign_newsletter.eml"
        },
        "indicators": {
            "ips": ["209.85.221.54"],
            "domains": ["techdigest.com"],
            "urls": ["https://techdigest.com/weekly/sept-15-2026"],
            "attachments": []
        }
    }
]

def get_demo_cases() -> List[Dict[str, Any]]:
    return DEMO_CASES
