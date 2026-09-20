from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "SOC Analyst"
    role: Optional[str] = "analyst"

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/login", response_model=AuthTokenResponse)
async def login(req: LoginRequest):
    return AuthTokenResponse(
        access_token=settings.SUPABASE_JWT_SECRET,
        token_type="bearer",
        user={"id": "usr-001", "email": req.email, "full_name": "SOC Analyst", "role": "analyst"}
    )

@router.post("/signup", response_model=AuthTokenResponse)
async def signup(req: SignupRequest):
    return AuthTokenResponse(
        access_token=settings.SUPABASE_JWT_SECRET,
        token_type="bearer",
        user={"id": "usr-002", "email": req.email, "full_name": req.full_name or "SOC Analyst", "role": req.role or "analyst"}
    )

@router.get("/me")
async def get_me():
    return {"id": "usr-001", "email": "analyst@company.com", "full_name": "Senior SOC Analyst", "role": "analyst"}
