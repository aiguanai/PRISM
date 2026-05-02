import asyncio
import tempfile
import uuid
from pathlib import Path
from typing import Optional

import structlog
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, UploadFile, File

from config import (
    ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, CLASSIFICATION_THRESHOLD,
    CATEGORY_SEVERITY, RISK_LEVELS, DEMO_CLAUSE, REPORTS_DIR
)
from models.schemas import (
    JobStatus, ProcessingStage, UploadResponse, StatusResponse, JobInfo
)

log = structlog.get_logger()
router = APIRouter()


def _compute_risk_score(analyzed_clauses: list[dict]) -> float:
    """Compute overall risk score 0–100."""
    if not analyzed_clauses:
        return 0.0
    flagged = [ac for ac in analyzed_clauses if ac.get("classification", {}).get("is_predatory")]
    if not flagged:
        return 0.0

    # Base score from flagged ratio
    ratio = len(flagged) / len(analyzed_clauses)
    base = ratio * 60

    # Severity bonus
    severity_bonus = 0.0
    for ac in flagged:
        cats = ac.get("classification", {}).get("categories", [])
        for cat in cats:
            if cat["severity"] == "HIGH":
                severity_bonus += 3.0
            else:
                severity_bonus += 1.5
        # Violation bonus
        for rr in ac.get("regulatory_results", []):
            if rr.get("verdict") == "VIOLATION":
                severity_bonus += 5.0
            elif rr.get("verdict") == "POSSIBLE_VIOLATION":
                severity_bonus += 2.0

    return min(100.0, base + severity_bonus)


def _risk_level(score: float) -> str:
    for label, (lo, hi) in RISK_LEVELS.items():
        if lo <= score <= hi:
            return label.replace("_", " ")
    return "CRITICAL"


async def _run_pipeline(job_id: str, file_path: Path, filename: str, jobs: dict):
    """Full analysis pipeline running as background task."""
    from services.extractor import extract_text, ExtractionError
    from services.segmenter import segment_clauses
    from services.classifier import classify_clauses
    from services.validator import validate_clauses_parallel
    from services.explainer import explain_clause
    from services.simplifier import simplify_clauses_batch
    from services.report_gen import generate_report
    from datetime import datetime

    def update(stage: ProcessingStage, progress: int):
        jobs[job_id]["status"] = JobStatus.PROCESSING
        jobs[job_id]["current_stage"] = stage
        jobs[job_id]["progress"] = progress

    try:
        # 1. Extract
        update(ProcessingStage.EXTRACTING, 10)
        extraction = extract_text(file_path)
        log.info("Extraction complete", method=extraction["extraction_method"],
                 chars=len(extraction["raw_text"]))

        if not extraction["raw_text"].strip():
            raise ValueError("No text could be extracted from the document. It may be a scanned image without OCR support or an empty file.")

        # 2. Segment
        update(ProcessingStage.SEGMENTING, 25)
        sentence_model = None
        try:
            from sentence_transformers import SentenceTransformer
            sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception:
            log.warning("sentence-transformers not available, skipping semantic segmentation")

        clauses = segment_clauses(extraction["raw_text"], sentence_model)
        log.info("Segmentation complete", clause_count=len(clauses))

        # 3. Classify
        update(ProcessingStage.CLASSIFYING, 45)
        zero_shot_pipeline = None
        classified_clauses = classify_clauses(clauses, zero_shot_pipeline)

        flagged_count = sum(1 for c in classified_clauses if c.get("classification", {}).get("is_predatory"))
        log.info("Classification complete", flagged=flagged_count, total=len(classified_clauses))

        # Build analyzed_clauses structure
        analyzed_clauses = []
        for cc in classified_clauses:
            ac = {
                "clause": {
                    "clause_id": cc["clause_id"],
                    "text": cc["text"],
                    "page_ref": cc.get("page_ref"),
                    "char_start": cc.get("char_start", 0),
                    "char_end": cc.get("char_end", 0),
                    "heading": cc.get("heading"),
                },
                "classification": cc.get("classification", {
                    "is_predatory": False, "categories": [], "overall_confidence": 0.0, "status": "analyzed"
                }),
                "explanation": None,
                "regulatory_results": [],
                "plain_explanation": None,
            }
            # Add explanation for flagged clauses
            if ac["classification"].get("is_predatory"):
                ac["explanation"] = explain_clause(
                    cc["clause_id"], cc["text"], ac["classification"].get("categories", [])
                )
            analyzed_clauses.append(ac)

        # 4. Validate
        update(ProcessingStage.VALIDATING, 65)
        analyzed_clauses = await validate_clauses_parallel(analyzed_clauses)
        log.info("Validation complete")

        # Simplify flagged clauses
        analyzed_clauses = await simplify_clauses_batch(analyzed_clauses)

        # 5. Generate report
        update(ProcessingStage.GENERATING_REPORT, 85)
        risk_score = _compute_risk_score(analyzed_clauses)
        violations = sum(
            1 for ac in analyzed_clauses
            for rr in ac.get("regulatory_results", [])
            if rr.get("verdict") == "VIOLATION"
        )

        analysis = {
            "job_id": job_id,
            "filename": filename,
            "total_clauses": len(analyzed_clauses),
            "flagged_clauses": flagged_count,
            "rbi_violations": violations,
            "overall_risk_score": round(risk_score, 1),
            "risk_level": _risk_level(risk_score),
            "analyzed_clauses": analyzed_clauses,
            "analysis_date": datetime.now(),
            "extraction_result": extraction,
        }

        report_path = generate_report(analysis)
        analysis["report_path"] = str(report_path)
        log.info("Report generated", path=str(report_path))

        jobs[job_id]["status"] = JobStatus.COMPLETED
        jobs[job_id]["progress"] = 100
        jobs[job_id]["current_stage"] = None
        jobs[job_id]["result"] = analysis

    except Exception as e:
        log.error("Pipeline failed", job_id=job_id, error=str(e))
        jobs[job_id]["status"] = JobStatus.FAILED
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["failed_stage"] = jobs[job_id].get("current_stage", "unknown")
    finally:
        try:
            file_path.unlink(missing_ok=True)
        except Exception:
            pass


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    # Validate extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read and size-check
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
        )

    job_id = str(uuid.uuid4())
    jobs: dict = request.app.state.jobs

    # Save to temp file
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp.write(content)
    tmp.close()
    tmp_path = Path(tmp.name)

    jobs[job_id] = {
        "job_id": job_id,
        "status": JobStatus.PROCESSING,
        "progress": 0,
        "current_stage": ProcessingStage.EXTRACTING,
        "result": None,
        "error": None,
        "filename": file.filename or "document",
        "failed_stage": None,
    }

    background_tasks.add_task(_run_pipeline, job_id, tmp_path, file.filename or "document", jobs)

    log.info("Job created", job_id=job_id, filename=file.filename)
    return UploadResponse(job_id=job_id, status="processing", estimated_seconds=45)


@router.get("/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str, request: Request):
    jobs: dict = request.app.state.jobs
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return StatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        current_stage=job.get("current_stage"),
        failed_stage=job.get("failed_stage"),
    )


@router.get("/results/{job_id}")
async def get_results(job_id: str, request: Request):
    jobs: dict = request.app.state.jobs
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    if job["status"] == JobStatus.PROCESSING:
        raise HTTPException(status_code=202, detail="Analysis still in progress.")
    if job["status"] == JobStatus.FAILED:
        raise HTTPException(status_code=500, detail=job.get("error", "Analysis failed."))
    return job["result"]


@router.get("/demo")
async def demo_analysis(request: Request, background_tasks: BackgroundTasks):
    """Run a demo analysis on a hardcoded predatory loan clause."""
    job_id = str(uuid.uuid4())
    jobs: dict = request.app.state.jobs
    jobs[job_id] = {
        "job_id": job_id,
        "status": JobStatus.PROCESSING,
        "progress": 0,
        "current_stage": ProcessingStage.EXTRACTING,
        "result": None,
        "error": None,
        "filename": "demo_predatory_loan.txt",
        "failed_stage": None,
    }

    async def _run_demo():
        from services.classifier import classify_clauses
        from services.validator import validate_clauses_parallel
        from services.explainer import explain_clause
        from services.simplifier import simplify_clauses_batch
        from services.report_gen import generate_report
        from datetime import datetime

        def update(stage: ProcessingStage, progress: int):
            jobs[job_id]["current_stage"] = stage
            jobs[job_id]["progress"] = progress

        try:
            update(ProcessingStage.EXTRACTING, 15)
            extraction = {
                "raw_text": DEMO_CLAUSE,
                "page_count": 1,
                "extraction_method": "demo",
                "confidence_score": 1.0,
            }

            update(ProcessingStage.SEGMENTING, 30)
            from services.segmenter import segment_clauses
            clauses = segment_clauses(DEMO_CLAUSE, None)
            if not clauses:
                clauses = [{
                    "clause_id": "clause_001",
                    "text": DEMO_CLAUSE.strip(),
                    "page_ref": 1,
                    "char_start": 0,
                    "char_end": len(DEMO_CLAUSE),
                    "heading": "5.3 PREPAYMENT, DEFAULT AND PENALTY CLAUSES",
                }]

            update(ProcessingStage.CLASSIFYING, 50)
            classified = classify_clauses(clauses, None)
            analyzed_clauses = []
            for cc in classified:
                ac = {
                    "clause": {
                        "clause_id": cc["clause_id"],
                        "text": cc["text"],
                        "page_ref": cc.get("page_ref"),
                        "char_start": cc.get("char_start", 0),
                        "char_end": cc.get("char_end", 0),
                        "heading": cc.get("heading"),
                    },
                    "classification": cc.get("classification", {
                        "is_predatory": False, "categories": [], "overall_confidence": 0.0, "status": "analyzed"
                    }),
                    "explanation": None,
                    "regulatory_results": [],
                    "plain_explanation": None,
                }
                if ac["classification"].get("is_predatory"):
                    ac["explanation"] = explain_clause(
                        cc["clause_id"], cc["text"], ac["classification"].get("categories", [])
                    )
                analyzed_clauses.append(ac)

            update(ProcessingStage.VALIDATING, 70)
            analyzed_clauses = await validate_clauses_parallel(analyzed_clauses)
            analyzed_clauses = await simplify_clauses_batch(analyzed_clauses)

            update(ProcessingStage.GENERATING_REPORT, 88)
            risk_score = _compute_risk_score(analyzed_clauses)
            violations = sum(
                1 for ac in analyzed_clauses
                for rr in ac.get("regulatory_results", [])
                if rr.get("verdict") == "VIOLATION"
            )
            flagged_count = sum(1 for ac in analyzed_clauses if ac.get("classification", {}).get("is_predatory"))

            analysis = {
                "job_id": job_id,
                "filename": "demo_predatory_loan.txt",
                "total_clauses": len(analyzed_clauses),
                "flagged_clauses": flagged_count,
                "rbi_violations": violations,
                "overall_risk_score": round(risk_score, 1),
                "risk_level": _risk_level(risk_score),
                "analyzed_clauses": analyzed_clauses,
                "analysis_date": datetime.now(),
                "extraction_result": extraction,
            }
            report_path = generate_report(analysis)
            analysis["report_path"] = str(report_path)

            jobs[job_id]["status"] = JobStatus.COMPLETED
            jobs[job_id]["progress"] = 100
            jobs[job_id]["result"] = analysis
        except Exception as e:
            log.error("Demo failed", error=str(e))
            jobs[job_id]["status"] = JobStatus.FAILED
            jobs[job_id]["error"] = str(e)

    background_tasks.add_task(_run_demo)
    return {"job_id": job_id, "status": "processing", "estimated_seconds": 15}
