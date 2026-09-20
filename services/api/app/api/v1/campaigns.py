from fastapi import APIRouter, HTTPException
from app.services.campaign_engine import get_all_campaigns, get_campaign_by_id

router = APIRouter(prefix="/campaigns", tags=["Threat Campaigns"])

@router.get("")
async def list_campaigns():
    return get_all_campaigns()

@router.get("/{id}")
async def get_campaign(id: str):
    camp = get_campaign_by_id(id)
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return camp
