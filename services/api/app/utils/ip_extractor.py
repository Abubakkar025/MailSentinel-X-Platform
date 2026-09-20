import re
import ipaddress
from typing import List, Tuple

IP_REGEX = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'

def is_private_ip(ip: str) -> bool:
    """Check if an IP is RFC 1918 private, loopback, or link-local."""
    try:
        ip_obj = ipaddress.ip_address(ip)
        return ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_reserved or ip_obj.is_multicast
    except ValueError:
        return True

def extract_ips(text: str) -> List[str]:
    """Extract all valid IPv4 addresses from text."""
    if not text:
        return []
    matches = re.findall(IP_REGEX, text)
    valid_ips = []
    for ip in matches:
        try:
            ipaddress.ip_address(ip)
            if ip not in valid_ips:
                valid_ips.append(ip)
        except ValueError:
            continue
    return valid_ips

def filter_public_ips(ips: List[str]) -> List[str]:
    """Filter out private/internal IPs, returning only routable public IPs."""
    return [ip for ip in ips if not is_private_ip(ip)]

def parse_received_header_ip(header_line: str) -> Tuple[str, str, str]:
    """
    Parse a Received header string to extract (from_host, by_host, client_ip).
    Example: 'from mail-wr1-f54.techdigest.com (mail-wr1-f54.techdigest.com [209.85.221.54]) by mx.company.com ...'
    """
    from_host = None
    by_host = None
    client_ip = None

    from_match = re.search(r'from\s+([^\s()]+)', header_line, re.IGNORECASE)
    if from_match:
        from_host = from_match.group(1)

    by_match = re.search(r'by\s+([^\s()]+)', header_line, re.IGNORECASE)
    if by_match:
        by_host = by_match.group(1)

    ip_match = re.search(r'\[([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\]', header_line)
    if ip_match:
        client_ip = ip_match.group(1)
    else:
        # Fallback IP search in header
        ips = extract_ips(header_line)
        if ips:
            client_ip = ips[0]

    return from_host or "unknown", by_host or "unknown", client_ip
