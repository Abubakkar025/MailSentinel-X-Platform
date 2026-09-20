from app.schemas.threat_intel import IPReputation, DomainIntel, URLScanResult
from app.services.threat_intel_providers import IPReputationProvider, URLScanProvider, DomainIntelProvider

async def check_ip_reputation(ip_address: str) -> IPReputation:
    return await IPReputationProvider.get_reputation(ip_address)

async def check_url(url: str, display_text: str = None) -> URLScanResult:
    return await URLScanProvider.scan_url(url, display_text=display_text)

async def check_domain(domain_name: str) -> DomainIntel:
    return await DomainIntelProvider.get_domain_intel(domain_name)
