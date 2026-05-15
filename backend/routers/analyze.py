"""
/analyze  — full pipeline endpoint (Stage 1–6)
/report   — stream the generated PDF report
"""
import asyncio
import os
import uuid
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from services.classifier import classify_clause, classify_clauses_batch
from services.explainer  import explain_clause, get_highlights
from services.extractor  import extract_text
from services.pii_scrubber import scrub_pii
from services.report_gen import generate_report, get_report_path
from services.segmenter  import segment_clauses
from services.simplifier import simplify_clause
from services.validator  import validate_clause

router = APIRouter(tags=["analysis"])

UPLOAD_DIR = "uploads"
SUPPORTED_EXTENSIONS = {".txt", ".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png", ".tiff"}
MAX_FILE_BYTES = 25 * 1024 * 1024  # 25 MB


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
        raise HTTPException(413, "File too large (limit 25 MB).")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        with open(file_path, "wb") as f:
            f.write(contents)

        # ── Stage 1: Extract (in thread — PDF parsing can block) ─────────────
        raw_text = await asyncio.to_thread(extract_text, file_path, ext)
        if not raw_text.strip():
            raise HTTPException(422, "No text could be extracted. Check the file is not blank or corrupt.")

        # ── Stage 2: Segment + PII scrub ──────────────────────────────────────
        clauses = await asyncio.to_thread(segment_clauses, raw_text)
        if not clauses:
            raise HTTPException(422, "No clauses detected in the document.")
        clauses = [scrub_pii(c) for c in clauses]

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

        results: List[dict] = await asyncio.to_thread(_run_all_sync)

        # ── Stage 6b: Build JSON + PDF report ─────────────────────────────────
        return generate_report(list(results), filename=file.filename)

    finally:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
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
        raise HTTPException(404, "Report not found. It may have been deleted or the ID is wrong.")

    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=f"PRISM_Report_{report_id[:8]}.pdf",
        headers={"Content-Disposition": f'attachment; filename="PRISM_Report_{report_id[:8]}.pdf"'},
    )
