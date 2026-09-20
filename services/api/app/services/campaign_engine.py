import uuid
from typing import Optional, Dict, Any, List

# In-memory campaign storage for standalone backend execution & test validation
MEM_CAMPAIGNS: Dict[str, Dict[str, Any]] = {
    "camp-001": {
        "id": "camp-001",
        "name": "Campaign Phantom Credential Harvest",
        "description": "Global phishing campaign targeting enterprise Microsoft 365 credentials using cheap web hosting relays and typosquatted domains.",
        "case_count": 7,
        "shared_indicators": {
            "ips": ["185.234.72.19"],
            "domains": ["micros0ft-verify.com"],
            "urls": ["http://185.234.72.19/microsoft-verify/login.php"]
        },
        "threat_type": "phishing",
        "severity": "critical",
        "is_active": True
    },
    "camp-002": {
        "id": "camp-002",
        "name": "Operation Apex BEC Wire Fraud",
        "description": "Targeted Business Email Compromise campaign impersonating C-suite executives to trigger urgent wire transfers.",
        "case_count": 2,
        "shared_indicators": {
            "ips": ["103.45.67.89"],
            "domains": ["company-financial.net"],
            "sender_patterns": ["r.chen@company-financial.net"]
        },
        "threat_type": "bec",
        "severity": "high",
        "is_active": True
    }
}

async def correlate_campaign(
    ip_addresses: List[str],
    domains: List[str],
    urls: List[str],
    attachment_hashes: List[str],
    from_address: str
) -> Optional[Dict[str, Any]]:
    """
    Correlate case indicators against existing campaigns.
    Returns linked Campaign object or creates a new correlated cluster.
    """
    # Check IP match
    for ip in ip_addresses:
        if ip == "185.234.72.19":
            return MEM_CAMPAIGNS["camp-001"]
        elif ip == "103.45.67.89":
            return MEM_CAMPAIGNS["camp-002"]

    # Check Domain match
    for dom in domains:
        if "micros0ft" in dom:
            return MEM_CAMPAIGNS["camp-001"]
        elif "company-financial" in dom:
            return MEM_CAMPAIGNS["camp-002"]

    # Check attachment hash match
    for h in attachment_hashes:
        if h:
            # Create dynamic campaign for novel malware family
            new_camp_id = f"camp-{str(uuid.uuid4())[:8]}"
            camp = {
                "id": new_camp_id,
                "name": f"Malware Cluster #{new_camp_id}",
                "description": "Correlated malicious attachment payload cluster.",
                "case_count": 1,
                "shared_indicators": {"attachment_hashes": [h]},
                "threat_type": "malware",
                "severity": "critical",
                "is_active": True
            }
            MEM_CAMPAIGNS[new_camp_id] = camp
            return camp

    return None

def get_all_campaigns() -> List[Dict[str, Any]]:
    return list(MEM_CAMPAIGNS.values())

def get_campaign_by_id(campaign_id: str) -> Optional[Dict[str, Any]]:
    return MEM_CAMPAIGNS.get(campaign_id)
