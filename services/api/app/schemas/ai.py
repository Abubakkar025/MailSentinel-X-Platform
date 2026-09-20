from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class AIQueryRequest(BaseModel):
    case_id: str
    query: str

class AIResponse(BaseModel):
    case_id: str
    query: str
    response: str
    context_used: Dict[str, Any] = {}
    model: str = "gemini-2.0-flash"
    timestamp: str

class AIHistoryItem(BaseModel):
    id: str
    query: str
    response: str
    created_at: str
