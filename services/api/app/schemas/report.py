from pydantic import BaseModel
from typing import Optional, Dict, Any

class ReportRequest(BaseModel):
    case_id: str
    format: str = "html" # html, pdf

class ReportResponse(BaseModel):
    case_id: str
    report_url: str
    generated_at: str
    file_name: str
