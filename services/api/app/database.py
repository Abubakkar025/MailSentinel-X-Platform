from supabase import create_client, Client
import redis.asyncio as redis
from app.config import settings

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_redis():
    return redis.from_url(settings.REDIS_URL, decode_responses=True)
