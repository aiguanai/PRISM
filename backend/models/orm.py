"""
SQLAlchemy ORM models — persistent analysis history.
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db import Base


class Analysis(Base):
    """One completed document analysis: summary columns + full result JSON."""

    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # uuid4 hex
    filename: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Summary (denormalised for fast list queries)
    total_clauses: Mapped[int] = mapped_column(Integer, default=0)
    critical_risk: Mapped[int] = mapped_column(Integer, default=0)
    high_risk: Mapped[int] = mapped_column(Integer, default=0)
    medium_risk: Mapped[int] = mapped_column(Integer, default=0)
    safe: Mapped[int] = mapped_column(Integer, default=0)
    rbi_violations: Mapped[int] = mapped_column(Integer, default=0)

    # PDF report
    report_id: Mapped[str] = mapped_column(String(32), default="")
    report_path: Mapped[str] = mapped_column(String(512), default="")

    # Full per-clause results as JSON text (regenerate report from this if PDF expired)
    result_json: Mapped[str] = mapped_column(Text, default="[]")

    def to_summary(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "report_id": self.report_id,
            "rbi_violations": self.rbi_violations,
            "summary": {
                "total_clauses": self.total_clauses,
                "critical_risk": self.critical_risk,
                "high_risk": self.high_risk,
                "medium_risk": self.medium_risk,
                "safe": self.safe,
            },
        }
