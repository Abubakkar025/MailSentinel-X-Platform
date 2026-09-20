from app.schemas.threat_intel import GeoLocation
from app.services.threat_intel_providers import GeoLocationProvider

async def geolocate_ip(ip_address: str) -> GeoLocation:
    return await GeoLocationProvider.get_geolocation(ip_address)
