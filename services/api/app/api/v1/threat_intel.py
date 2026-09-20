from fastapi import APIRouter, Query
from app.services.threat_intel import check_ip_reputation, check_url, check_domain
from app.services.geolocation import geolocate_ip

router = APIRouter(prefix="/threat-intel", tags=["Threat Intelligence"])

@router.get("/ip/{ip}")
async def get_ip_intel(ip: str):
    rep = await check_ip_reputation(ip)
    geo = await geolocate_ip(ip)
    return {"reputation": rep, "geolocation": geo}

@router.get("/domain/{domain}")
async def get_domain_intel(domain: str):
    return await check_domain(domain)

@router.get("/url")
async def get_url_intel(url: str = Query(...)):
    return await check_url(url)
