from fastapi import APIRouter
from app.api.v1 import (
    auth,
    dashboard,
    investigate,
    cases,
    threat_intel,
    ai_analyst,
    campaigns,
    reports,
    demo
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(investigate.router)
api_router.include_router(cases.router)
api_router.include_router(threat_intel.router)
api_router.include_router(ai_analyst.router)
api_router.include_router(campaigns.router)
api_router.include_router(reports.router)
api_router.include_router(demo.router)
