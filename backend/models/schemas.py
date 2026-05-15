from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStage(str, Enum):
    EXTRACTING = "extracting"
    SEGMENTING = "segmenting"
    CLASSIFYING = "classifying"
    VALIDATING = "validating"
    GENERATING_REPORT = "generating_report"


class Severity(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RegulatoryVerdict(str, Enum):
    VIOLATION = "VIOLATION"
    POSSIBLE_VIOLATION = "POSSIBLE_VIOLATION"
    COMPLIANT = "COMPLIANT"


class ExtractionResult(BaseModel):
    raw_text: str
    page_count: int
    extraction_method: str
    confidence_score: float


class Clause(BaseModel):
    clause_id: str
    text: str
    page_ref: Optional[int] = None
    char_start: int
    char_end: int
    heading: Optional[str] = None


class CategoryResult(BaseModel):
    name: str
    confidence: float
    severity: Severity


class ClassificationResult(BaseModel):
    is_predatory: bool
    categories: List[CategoryResult]
    overall_confidence: float
    status: str = "analyzed"


class HighlightedSpan(BaseModel):
    text: str
    start: int
    end: int
    importance_score: float


class ExplanationResult(BaseModel):
    clause_id: str
    highlighted_spans: List[HighlightedSpan]


class RegulatoryResult(BaseModel):
    rule_id: str
    rule_description: str
    verdict: RegulatoryVerdict
    source: str
    plain_rule: str = ""


class AnalyzedClause(BaseModel):
    clause: Clause
    classification: ClassificationResult
    explanation: Optional[ExplanationResult] = None
    regulatory_results: List[RegulatoryResult] = []
    plain_explanation: Optional[str] = None


class DocumentAnalysis(BaseModel):
    job_id: str
    filename: str
    total_clauses: int
    flagged_clauses: int
    rbi_violations: int
    overall_risk_score: float
    risk_level: str
    analyzed_clauses: List[AnalyzedClause]
    analysis_date: datetime
    extraction_result: ExtractionResult


class JobInfo(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = 0
    current_stage: Optional[ProcessingStage] = None
    result: Optional[DocumentAnalysis] = None
    error: Optional[str] = None
    filename: str = ""
    failed_stage: Optional[str] = None


class UploadResponse(BaseModel):
    job_id: str
    status: str
    estimated_seconds: int


class StatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int
    current_stage: Optional[ProcessingStage]
    failed_stage: Optional[str] = None


class ProblemDetail(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    instance: Optional[str] = None
