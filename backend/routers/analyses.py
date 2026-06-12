"""
Analysis history endpoints (persistent, DB-backed).

GET    /analyses          — paginated list of past analyses (summaries)
GET    /analyses/{id}     — full stored result for one analysis
DELETE /analyses/{id}     — delete an analysis and its PDF report
"""
import json
import os

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from models.orm import Analysis

router = APIRouter(prefix="/analyses", tags=["history"])


@router.get("")
async def list_analyses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=255),
    session: AsyncSession = Depends(get_session),
):
    query = select(Analysis)
    count_query = select(func.count(Analysis.id))
    if search:
        pattern = f"%{search}%"
        query = query.where(Analysis.filename.ilike(pattern))
        count_query = count_query.where(Analysis.filename.ilike(pattern))

    total = (await session.execute(count_query)).scalar() or 0
    rows = (
        await session.execute(
            query.order_by(Analysis.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    return {
        "items": [a.to_summary() for a in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str, session: AsyncSession = Depends(get_session)):
    analysis = await _get_or_404(analysis_id, session)
    return {
        **analysis.to_summary(),
        "status": "success",
        "results": json.loads(analysis.result_json or "[]"),
    }


@router.delete("")
async def clear_analyses(session: AsyncSession = Depends(get_session)):
    """Delete ALL analyses and their PDF reports."""
    rows = (await session.execute(select(Analysis))).scalars().all()
    for analysis in rows:
        if analysis.report_path and os.path.exists(analysis.report_path):
            try:
                os.remove(analysis.report_path)
            except OSError:
                pass
    await session.execute(delete(Analysis))
    await session.commit()
    return {"status": "cleared", "deleted": len(rows)}


@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: str, session: AsyncSession = Depends(get_session)):
    analysis = await _get_or_404(analysis_id, session)

    if analysis.report_path and os.path.exists(analysis.report_path):
        try:
            os.remove(analysis.report_path)
        except OSError:
            pass

    await session.execute(delete(Analysis).where(Analysis.id == analysis_id))
    await session.commit()
    return {"status": "deleted", "id": analysis_id}


async def _get_or_404(analysis_id: str, session: AsyncSession) -> Analysis:
    if not analysis_id.replace("-", "").isalnum():
        raise HTTPException(400, "Invalid analysis id.")
    analysis = (
        await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    ).scalar_one_or_none()
    if analysis is None:
        raise HTTPException(404, "Analysis not found.")
    return analysis
