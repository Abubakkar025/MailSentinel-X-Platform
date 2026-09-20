import re
from typing import Optional
from app.schemas.email import AuthResults

def analyze_auth(auth_results_header: Optional[str]) -> AuthResults:
    """
    Parse Authentication-Results RFC 8601 header to detect SPF, DKIM, and DMARC status.
    """
    if not auth_results_header:
        return AuthResults(
            spf_result="none",
            dkim_result="none",
            dmarc_result="none",
            auth_header_raw=None
        )

    header_clean = auth_results_header.lower()

    # Parse SPF result: e.g. "spf=pass", "spf=fail", "spf=softfail"
    spf_res = "none"
    spf_match = re.search(r'spf=(pass|fail|softfail|neutral|none|temperror|permerror)', header_clean)
    if spf_match:
        spf_res = spf_match.group(1)

    # Parse DKIM result: e.g. "dkim=pass", "dkim=fail"
    dkim_res = "none"
    dkim_match = re.search(r'dkim=(pass|fail|neutral|none)', header_clean)
    if dkim_match:
        dkim_res = dkim_match.group(1)

    # Parse DMARC result: e.g. "dmarc=pass", "dmarc=fail"
    dmarc_res = "none"
    dmarc_match = re.search(r'dmarc=(pass|fail|none)', header_clean)
    if dmarc_match:
        dmarc_res = dmarc_match.group(1)

    # Extract signing/envelope domain if present
    spf_domain = None
    spf_dom_match = re.search(r'smtp\.mailfrom=([^\s;]+)', header_clean)
    if spf_dom_match:
        spf_domain = spf_dom_match.group(1)

    dkim_domain = None
    dkim_dom_match = re.search(r'header\.d=([^\s;]+)', header_clean)
    if dkim_dom_match:
        dkim_domain = dkim_dom_match.group(1)

    dmarc_policy = None
    policy_match = re.search(r'p=(reject|quarantine|none)', header_clean)
    if policy_match:
        dmarc_policy = policy_match.group(1)

    return AuthResults(
        spf_result=spf_res,
        dkim_result=dkim_res,
        dmarc_result=dmarc_res,
        auth_header_raw=auth_results_header,
        spf_domain=spf_domain,
        dkim_domain=dkim_domain,
        dmarc_policy=dmarc_policy
    )
