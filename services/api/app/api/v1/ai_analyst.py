from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from app.schemas.ai import AIQueryRequest, AIResponse
from app.services.ai_analyst import analyze_case_with_ai, save_chat_history, get_chat_history
from app.api.v1.cases import get_case_detail

router = APIRouter(prefix="/ai", tags=["AI SOC Copilot"])

@router.post("/chat", response_model=AIResponse)
async def chat_with_copilot(req: AIQueryRequest):
    case_context = {}
    try:
        case_context = await get_case_detail(req.case_id)
    except Exception:
        case_context = {"case_number": req.case_id, "risk_score": 75, "threat_type": "phishing"}

    ans = await analyze_case_with_ai(req.case_id, case_context, req.query)
    ts = datetime.now(timezone.utc).isoformat()
    save_chat_history(req.case_id, req.query, ans)

    return AIResponse(
        case_id=req.case_id,
        query=req.query,
        response=ans,
        context_used={"case_id": req.case_id},
        model="gemini-2.0-flash",
        timestamp=ts
    )

@router.get("/history/{case_id}")
async def get_ai_history(case_id: str):
    return get_chat_history(case_id)
