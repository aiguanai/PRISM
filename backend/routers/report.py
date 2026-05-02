from pathlib import Path

import structlog
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse

from config import REPORTS_DIR
from models.schemas import JobStatus

log = structlog.get_logger()
router = APIRouter()


@router.get("/report/{job_id}")
async def download_report(job_id: str, request: Request):
    jobs: dict = request.app.state.jobs
    job = jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    if job["status"] != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Report not ready yet.")

    # Try PDF first, then HTML fallback
    pdf_path = REPORTS_DIR / f"{job_id}.pdf"
    html_path = REPORTS_DIR / f"{job_id}.html"

    if pdf_path.exists():
        filename = f"PRISM_Report_{job_id[:8]}.pdf"
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    if html_path.exists():
        filename = f"PRISM_Report_{job_id[:8]}.html"
        return FileResponse(
            path=str(html_path),
            media_type="text/html",
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # Last resort: return JSON result
    result = job.get("result")
    if result:
        log.warning("No file report found, returning JSON", job_id=job_id)
        return JSONResponse(content=result)

    raise HTTPException(status_code=404, detail="Report file not found. Try regenerating.")
