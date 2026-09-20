from fastapi import APIRouter
from app.services.demo_data import get_demo_cases
from app.api.v1.investigate import MEM_INVESTIGATED_CASES

router = APIRouter(prefix="/demo", tags=["Demo Mode Management"])

@router.post("/seed")
async def seed_demo_data():
    cases = get_demo_cases()
    return {"status": "success", "message": f"Seeded {len(cases)} demo cases.", "cases_seeded": len(cases)}

@router.post("/reset")
async def reset_demo_data():
    MEM_INVESTIGATED_CASES.clear()
    return {"status": "success", "message": "Cleared custom uploaded demo cases."}
