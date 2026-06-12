"""
/analyze  — full pipeline endpoint (Stage 1–6)
/report   — stream the generated PDF report
"""
import asyncio
import json
import logging
import os
import time
import uuid
from typing import List

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select

from config import settings
from db import SessionLocal
from models.orm import Analysis
from rate_limit import limiter
from services.classifier import classify_clause, classify_clauses_batch
from services.explainer  import explain_clause, get_highlights
from services.extractor  import extract_text
from services.pii_scrubber import scrub_pii
from services.report_gen import (
    generate_report,
    get_report_path,
    regenerate_report,
    report_path_for,
)
from services.segmenter  import segment_clauses
from services.simplifier import simplify_clause
from services.validator  import validate_clause

logger = logging.getLogger("prism.analyze")

router = APIRouter(tags=["analysis"])

UPLOAD_DIR = "uploads"
SUPPORTED_EXTENSIONS = {".txt", ".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png", ".tiff"}
MAX_FILE_BYTES = settings.MAX_FILE_MB * 1024 * 1024

# Magic-byte signatures per extension (txt has none — skipped)
_MAGIC_BYTES = {
    ".pdf":  [b"%PDF"],
    ".docx": [b"PK\x03\x04"],
    ".doc":  [b"\xd0\xcf\x11\xe0", b"PK\x03\x04"],
    ".jpg":  [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png":  [b"\x89PNG"],
    ".tiff": [b"II*\x00", b"MM\x00*"],
}


def _check_magic_bytes(contents: bytes, ext: str) -> bool:
    """Verify the file content matches its claimed extension."""
    signatures = _MAGIC_BYTES.get(ext)
    if not signatures:
        return True  # .txt and unknown types — no signature to check
    return any(contents.startswith(sig) for sig in signatures)


# ── Pipeline ──────────────────────────────────────────────────────────────────

async def _run_pipeline(file: UploadFile) -> dict:
    """Execute all 6 stages and return the complete report dict."""
    if not file.filename:
        raise HTTPException(400, "No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Supported: {sorted(SUPPORTED_EXTENSIONS)}")

    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Empty file.")
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(413, f"File too large (limit {settings.MAX_FILE_MB} MB).")
    if not _check_magic_bytes(contents, ext):
        raise HTTPException(400, f"File content does not match the '{ext}' extension. The file may be renamed or corrupt.")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        with open(file_path, "wb") as f:
            f.write(contents)

        # ── Stage 1: Extract (in thread — PDF parsing can block) ─────────────
        t0 = time.perf_counter()
        raw_text = await asyncio.to_thread(extract_text, file_path, ext)
        if not raw_text.strip():
            raise HTTPException(422, "No text could be extracted. Check the file is not blank or corrupt.")
        logger.info(f"Stage 1 extract: {len(raw_text)} chars ({time.perf_counter() - t0:.1f}s)")

        # ── Stage 2: Segment + PII scrub ──────────────────────────────────────
        t0 = time.perf_counter()
        clauses = await asyncio.to_thread(segment_clauses, raw_text)
        if not clauses:
            raise HTTPException(422, "No clauses detected in the document.")
        clauses = [scrub_pii(c) for c in clauses]
        logger.info(f"Stage 2 segment+scrub: {len(clauses)} clauses ({time.perf_counter() - t0:.1f}s)")

        # ── Stages 3–6a: Run all CPU-bound work in a thread ─────────────────────
        # asyncio.to_thread releases the event loop while processing so FastAPI
        # can accept new requests (second uploads) while this one is running.
        def _run_all_sync() -> List[dict]:
            # Batch classify — one model call for all clauses
            clfs = classify_clauses_batch(clauses)
            out  = []
            for clause, cl in zip(clauses, clfs):
                label      = cl["label"]
                confidence = cl["confidence"]
                validation = validate_clause(clause, label)
                out.append({
                    "clause":        clause,
                    "label":         label,
                    "confidence":    confidence,
                    "explanation":   explain_clause(clause, label),
                    "simplified":    simplify_clause(clause, label),
                    "highlights":    get_highlights(clause, label),
                    "risk_level":    validation["risk_level"],
                    "matched_rules": validation["matched_rules"],
                })
            return out

        t0 = time.perf_counter()
        results: List[dict] = await asyncio.to_thread(_run_all_sync)
        logger.info(f"Stages 3-6a classify+validate+explain: ({time.perf_counter() - t0:.1f}s)")

        # ── Stage 6b: Build JSON + PDF report ─────────────────────────────────
        t0 = time.perf_counter()
        report = generate_report(list(results), filename=file.filename)
        logger.info(f"Stage 6b report: id={report.get('report_id')} ({time.perf_counter() - t0:.1f}s)")

        # ── Persist to DB so history survives restarts ────────────────────────
        await _save_analysis(report)
        return report

    finally:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass


async def _save_analysis(report: dict) -> None:
    """Persist a completed analysis. Failures are logged, never fatal."""
    try:
        summary = report.get("summary", {})
        violations = sum(len(r.get("matched_rules", [])) for r in report.get("results", []))
        async with SessionLocal() as session:
            session.add(Analysis(
                id=report["report_id"],
                rbi_violations=violations,
                filename=report.get("filename", ""),
                total_clauses=summary.get("total_clauses", 0),
                critical_risk=summary.get("critical_risk", 0),
                high_risk=summary.get("high_risk", 0),
                medium_risk=summary.get("medium_risk", 0),
                safe=summary.get("safe", 0),
                report_id=report["report_id"],
                report_path=report_path_for(report["report_id"]),
                result_json=json.dumps(report.get("results", [])),
            ))
            await session.commit()
    except Exception:
        logger.exception("Failed to persist analysis")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/analyze")
@limiter.limit(settings.ANALYZE_RATE_LIMIT)
async def analyze_document(request: Request, file: UploadFile = File(...)):
    """Upload a document and receive the full risk analysis report."""
    try:
        return JSONResponse(content=await _run_pipeline(file))
    except HTTPException:
        raise
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "filename": getattr(file, "filename", ""), "message": str(exc)},
        )


@router.post("/analyze/batch")
async def analyze_batch(files: List[UploadFile] = File(...)):
    """Analyze multiple documents in one request."""
    reports = []
    for f in files:
        try:
            reports.append(await _run_pipeline(f))
        except HTTPException as exc:
            reports.append({"status": "error", "filename": f.filename, "message": exc.detail})
        except Exception as exc:
            reports.append({"status": "error", "filename": f.filename, "message": str(exc)})
    return {"status": "success", "count": len(reports), "reports": reports}


@router.get("/report/{report_id}")
async def download_report(report_id: str):
    """Stream the generated PDF report for a completed analysis."""
    # Sanitise report_id to prevent path traversal
    if not report_id.replace("-", "").isalnum():
        raise HTTPException(400, "Invalid report_id.")

    path = get_report_path(report_id)
    if path is None:
        # PDF expired/cleaned — regenerate from the stored analysis JSON
        async with SessionLocal() as session:
            analysis = (
                await session.execute(select(Analysis).where(Analysis.report_id == report_id))
            ).scalar_one_or_none()
        if analysis is None:
            raise HTTPException(404, "Report not found. It may have been deleted or the ID is wrong.")
        results = json.loads(analysis.result_json or "[]")
        path = await asyncio.to_thread(regenerate_report, results, analysis.filename, report_id)

    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=f"PRISM_Report_{report_id[:8]}.pdf",
        headers={"Content-Disposition": f'attachment; filename="PRISM_Report_{report_id[:8]}.pdf"'},
    )
