from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time

from app.config import settings
from app.api.v1.router import api_router
from app.core.rate_limiter import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup context
    yield
    # Shutdown context

app = FastAPI(
    title="MailSentinel X API",
    version="1.0.0",
    lifespan=lifespan
)

if hasattr(limiter, "key_func"):
    app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": app.version}
