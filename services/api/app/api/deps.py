from fastapi import Depends, HTTPException, status, Header
from jose import jwt, JWTError
from app.database import get_supabase, get_redis
from app.config import settings
from typing import Optional

def get_db():
    return get_supabase()

def get_cache():
    return get_redis()

def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.split(" ")[1]
    try:
        # In a real app, verify with Supabase JWT secret
        payload = jwt.decode(token, settings.SUPABASE_KEY, algorithms=["HS256"], options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not found")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(user=Depends(get_current_user)):
    role = user.get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user
