from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import REPORTS_DIR
from routers import upload, report

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("PRISM backend starting up...")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    # In-memory job store
    app.state.jobs = {}

    # Pre-load lightweight resources
    try:
        from services.validator import _load_rules
        _load_rules()
    except Exception as e:
        log.warning("Could not pre-load RBI rules", error=str(e))

    log.info("PRISM backend ready", reports_dir=str(REPORTS_DIR))
    yield
    log.info("PRISM backend shutting down")


app = FastAPI(
    title="PRISM API",
    description="Predatory Risk Intelligence for Smart MSME lending — clause analysis engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["Analysis"])
app.include_router(report.router, prefix="/api", tags=["Reports"])


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "PRISM", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception", path=str(request.url), error=str(exc))
    return JSONResponse(
        status_code=500,
        content={
            "type": "https://prism.local/errors/internal",
            "title": "Internal Server Error",
            "status": 500,
            "detail": str(exc),
            "instance": str(request.url),
        },
    )
