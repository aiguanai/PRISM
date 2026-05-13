"""
/analyze endpoint — runs the full pipeline on an uploaded document.
"""
import json
import os
import uuid
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from services.classifier import classify_clause
from services.explainer import explain_clause
from services.extractor import extract_text
from services.pii_scrubber import scrub_pii
from services.report_gen import generate_report
from services.segmenter import segment_clauses
from services.simplifier import simplify_clause
from services.validator import validate_clause

router = APIRouter(tags=["analysis"])

UPLOAD_DIR = "uploads"
SUPPORTED_EXTENSIONS = {".txt", ".pdf", ".docx"}
MAX_FILE_BYTES = 25 * 1024 * 1024  # 25 MB safety limit


async def _process_upload(file: UploadFile) -> dict:
    """Run the full analysis pipeline on a single UploadFile. Returns the report dict."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: {sorted(SUPPORTED_EXTENSIONS)}",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File too large (limit 25 MB)")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        with open(file_path, "wb") as f:
            f.write(contents)

        # 1. Extract text
        text = extract_text(file_path, ext)
        if not text or not text.strip():
            raise HTTPException(
                status_code=422, detail="Could not extract any text from the file"
            )

        # 2. Scrub PII
        clean_text = scrub_pii(text)

        # 3. Segment into clauses
        clauses = segment_clauses(clean_text)
        if not clauses:
            raise HTTPException(
                status_code=422, detail="No clauses detected in the document"
            )

        # 4-7. Classify / explain / simplify / validate each clause
        results: List[dict] = []
        for clause in clauses:
            classification = classify_clause(clause)
            label = classification["label"]
            confidence = classification["confidence"]
            results.append({
                "clause": clause,
                "label": label,
                "confidence": confidence,
                "explanation": explain_clause(clause, label),
                "simplified": simplify_clause(clause),
                "risk_level": validate_clause(clause, label),
            })

        # 8. Build report
        return generate_report(results, filename=file.filename)

    finally:
        # Always clean up the temp upload file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass


@router.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    """
    Analyze a single legal document (TXT/PDF/DOCX) and return a structured risk report.
    """
    try:
        report = await _process_upload(file)
        return JSONResponse(content=report)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive catch-all
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "filename": getattr(file, "filename", None),
                "message": str(exc),
            },
        )


@router.post("/analyze/batch")
async def analyze_batch(files: List[UploadFile] = File(...)):
    """
    Analyze multiple documents in one request. Returns one report per file.
    """
    reports = []
    for f in files:
        try:
            report = await _process_upload(f)
            reports.append(report)
        except HTTPException as exc:
            reports.append({
                "status": "error",
                "filename": f.filename,
                "message": exc.detail,
            })
        except Exception as exc:  # pragma: no cover
            reports.append({
                "status": "error",
                "filename": f.filename,
                "message": str(exc),
            })
    return {"status": "success", "count": len(reports), "reports": reports}
