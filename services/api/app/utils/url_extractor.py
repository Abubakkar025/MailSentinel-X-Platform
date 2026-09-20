import re
from typing import List, Dict, Any
from urllib.parse import urlparse
from bs4 import BeautifulSoup

URL_SHORTENERS = [
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
    'adf.ly', 'bit.do', 'cutt.ly', 'rb.gy', 'shorturl.at', 'tiny.cc'
]

URL_REGEX = r'https?://[^\s<>"\'\]\)]+'

def extract_urls_from_text(text: str) -> List[str]:
    """Extract all plain URLs from plain text."""
    if not text:
        return []
    matches = re.findall(URL_REGEX, text)
    cleaned = []
    for u in matches:
        # Strip trailing punctuation
        u = u.rstrip('.,;:')
        if u not in cleaned:
            cleaned.append(u)
    return cleaned

def extract_urls(text: str, html: str = None) -> List[Dict[str, Any]]:
    """
    Extract detailed URL information from text and HTML body.
    Detects anchor text vs href mismatches and shortener URLs.
    """
    results = []
    seen_urls = set()

    # Process HTML anchor tags if provided
    if html:
        try:
            soup = BeautifulSoup(html, 'html.parser')
            for a_tag in soup.find_all('a', href=True):
                href = a_tag['href'].strip()
                if href.startswith('http://') or href.startswith('https://'):
                    display_text = a_tag.get_text(strip=True) or href
                    parsed = urlparse(href)
                    domain = parsed.netloc.split(':')[0]
                    is_short = any(s in domain.lower() for s in URL_SHORTENERS)

                    # Check for mismatch: e.g. display text says "paypal.com" but href is "evil.com"
                    is_mismatch = False
                    if display_text.startswith('http://') or display_text.startswith('https://'):
                        parsed_display = urlparse(display_text)
                        if parsed_display.netloc and parsed_display.netloc != parsed.netloc:
                            is_mismatch = True

                    if href not in seen_urls:
                        seen_urls.add(href)
                        results.append({
                            "url": href,
                            "display_text": display_text,
                            "domain": domain,
                            "is_shortened": is_short,
                            "is_mismatch": is_mismatch
                        })
        except Exception:
            pass

    # Process plain text URLs
    text_urls = extract_urls_from_text(text)
    for href in text_urls:
        if href not in seen_urls:
            seen_urls.add(href)
            parsed = urlparse(href)
            domain = parsed.netloc.split(':')[0]
            is_short = any(s in domain.lower() for s in URL_SHORTENERS)
            results.append({
                "url": href,
                "display_text": href,
                "domain": domain,
                "is_shortened": is_short,
                "is_mismatch": False
            })

    return results
