"""
Entry point for the Legal Document Risk Analysis API.

Run with:
    uvicorn main:app --reload
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analyze
from services.classifier import warmup_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- startup ----
    print("[startup] Legal Document Risk Analysis API starting...")
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("models/weights", exist_ok=True)
    warmup_model()
    print("[startup] Ready.")
    yield
    # ---- shutdown ----
    print("[shutdown] Goodbye.")


app = FastAPI(
    title="Legal Document Risk Analysis API",
    description=(
        "Upload a legal document (TXT/PDF/DOCX). The system extracts text, "
        "redacts PII, segments clauses, classifies risky clauses, explains the "
        "reasoning, and returns a structured risk report."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Permissive CORS for local frontend development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(analyze.router)


@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "Legal Document Risk Analysis API",
        "version": "1.0.0",
        "endpoints": ["/analyze", "/analyze/batch", "/health", "/docs"],
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
