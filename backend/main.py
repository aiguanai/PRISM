"""
Entry point for the Legal Document Risk Analysis API.

Run with:
    uvicorn main:app --reload
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import settings
from db import init_db
from logging_config import RequestIDMiddleware, setup_logging
from rate_limit import limiter
from routers import analyses, analyze
from services.classifier import warmup_model
from services.report_gen import cleanup_expired_reports

setup_logging()
logger = logging.getLogger("prism")


async def _report_cleanup_loop() -> None:
    """Delete expired report PDFs once an hour."""
    while True:
        try:
            await asyncio.to_thread(cleanup_expired_reports)
        except Exception:
            logger.exception("Report cleanup failed")
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- startup ----
    logger.info("Legal Document Risk Analysis API starting...")
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("models/weights", exist_ok=True)
    await init_db()
    warmup_model()
    cleanup_task = asyncio.create_task(_report_cleanup_loop())
    logger.info("Ready.")
    yield
    # ---- shutdown ----
    cleanup_task.cancel()
    logger.info("Shutting down.")


app = FastAPI(
    title="Legal Document Risk Analysis API",
    description=(
        "Upload a legal document (TXT/PDF/DOCX). The system extracts text, "
        "redacts PII, segments clauses, classifies risky clauses, explains the "
        "reasoning, and returns a structured risk report."
    ),
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIDMiddleware)

# Rate limiting (per-IP, slowapi)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Consistent JSON error shape for anything not raised as HTTPException."""
    request_id = getattr(request.state, "request_id", "")
    logger.exception(f"[{request_id}] Unhandled error on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Check backend logs.",
            "request_id": request_id,
        },
    )

# Routers
app.include_router(analyze.router)
app.include_router(analyses.router)


@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "Legal Document Risk Analysis API",
        "version": "1.1.0",
        "endpoints": ["/analyze", "/analyze/batch", "/analyses", "/health", "/docs"],
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
