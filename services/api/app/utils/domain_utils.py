import re
from typing import Tuple, Optional, List
from urllib.parse import urlparse

FREE_EMAIL_PROVIDERS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'protonmail.com', 'proton.me', 'icloud.com', 'mail.com', 'zoho.com',
    'gmx.com', 'yandex.com', 'tutanota.com'
]

KNOWN_BRANDS = [
    'microsoft.com', 'google.com', 'apple.com', 'amazon.com', 'paypal.com',
    'facebook.com', 'netflix.com', 'linkedin.com', 'docusign.net', 'docusign.com',
    'dropbox.com', 'chase.com', 'wellsfargo.com', 'bankofamerica.com'
]

def extract_domain(email_or_url: str) -> str:
    """Extract domain name from an email address or URL."""
    if not email_or_url:
        return ""
    if "@" in email_or_url:
        return email_or_url.split("@")[-1].strip().lower()
    if email_or_url.startswith("http://") or email_or_url.startswith("https://"):
        parsed = urlparse(email_or_url)
        return parsed.netloc.split(":")[0].lower()
    return email_or_url.strip().lower()

def is_free_email_provider(domain: str) -> bool:
    """Check if domain is a known free webmail provider."""
    return domain.lower() in FREE_EMAIL_PROVIDERS

def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def check_typosquatting(domain: str, known_brands: List[str] = None) -> Tuple[bool, Optional[str], int]:
    """
    Check if a domain is a typosquatting/lookalike variant of a known brand domain.
    Returns (is_typosquatted, target_brand, distance).
    """
    if not domain:
        return False, None, 99

    brands = known_brands or KNOWN_BRANDS
    domain_clean = domain.lower()

    # Exact match is not typosquatting
    if domain_clean in brands:
        return False, domain_clean, 0

    for brand in brands:
        # Check Levenshtein distance on domain name excluding TLD if possible
        brand_name = brand.split('.')[0]
        domain_name = domain_clean.split('.')[0]

        # Homoglyph/typosquat replacement check (e.g. micros0ft vs microsoft)
        dist = levenshtein_distance(domain_name, brand_name)
        if 1 <= dist <= 2 and len(domain_name) >= 5:
            return True, brand, dist

        # Keyword inclusion check: e.g., 'micros0ft-verify.com' or 'paypal-security.com'
        if brand_name in domain_clean and domain_clean != brand:
            return True, brand, 1

    return False, None, 99
