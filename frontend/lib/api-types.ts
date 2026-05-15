/**
 * PRISM API — Request & Response Types
 *
 * These are the wire-format shapes exchanged with the backend.
 * They mirror the UI types in lib/types.ts but are kept separate
 * so the backend can evolve independently (e.g. snake_case, ISO strings).
 */

/* ── Shared primitives ── */

export type RiskLevel   = 'critical' | 'high' | 'medium' | 'low';
export type ClauseType  =
  | 'interest_rate' | 'penal_charges' | 'prepayment' | 'collateral'
  | 'guarantee'     | 'foreclosure'   | 'disclosure'  | 'arbitration'
  | 'repayment'     | 'general';

export type AnalysisPhase =
  | 'scanning' | 'extracting' | 'analyzing' | 'intelligence' | 'complete';

/* ── Upload ── */

/** POST /api/documents/upload  (multipart/form-data, field: "file") */
export interface UploadResponse {
  documentId: string;   // UUID assigned by backend
  fileName:   string;
  fileSize:   number;   // bytes
  mimeType:   string;
  uploadedAt: string;   // ISO 8601
}

/* ── Analysis ── */

/**
 * POST /api/documents/:documentId/analyze
 * Returns a jobId; client then polls or subscribes via SSE.
 */
export interface AnalyzeRequest {
  documentId: string;
}

export interface AnalyzeResponse {
  jobId:      string;
  documentId: string;
  status:     'queued' | 'processing' | 'complete' | 'failed';
}

/**
 * GET /api/jobs/:jobId/status
 * Polled by the client to drive the processing timeline.
 */
export interface JobStatusResponse {
  jobId:                  string;
  documentId:             string;
  phase:                  AnalysisPhase;
  progress:               number;   // 0–100
  message:                string;
  estimatedTimeRemaining: number;   // seconds
  status:                 'queued' | 'processing' | 'complete' | 'failed';
  error?:                 string;
}

/**
 * GET /api/documents/:documentId/analysis
 * Full analysis result — returned once job is complete.
 */
export interface AnalysisResultResponse {
  id:             string;
  documentId:     string;
  documentName:   string;
  lenderName:     string;
  analyzedAt:     string;   // ISO 8601
  predatoryScore: number;
  overallRisk: {
    level:    RiskLevel;
    score:    number;
    category: string;
    details:  string;
  };
  trueCost: {
    loanAmount:          number;
    tenure:              number;
    statedInterestRate:  number;
    effectiveAnnualRate: number;
    processingFee:       number;
    penalInterestRate:   number;
    prepaymentPenalty:   number;
    insurancePremium:    number;
    otherCharges:        number;
    totalRepayable:      number;
  };
  clauses: Array<{
    id:              string;
    title:           string;
    content:         string;
    riskLevel:       RiskLevel;
    riskScore:       number;
    summary:         string;
    recommendations: string[];
    lineNumber?:     number;
    clauseType?:     ClauseType;
    rbiViolation?:   string;
  }>;
  rbiViolations: Array<{
    id:          string;
    regulation:  string;
    description: string;
    severity:    'critical' | 'high' | 'medium';
    clauseRef:   string;
  }>;
  keyFindings:     string[];
  legalReferences: string[];
  financialImpact?: {
    estimatedCost: number;
    confidence:    number;
    details:       string;
  };
  insights: Array<{
    category:   'risk' | 'opportunity' | 'compliance' | 'optimization';
    title:      string;
    description: string;
    impact:     'high' | 'medium' | 'low';
    actionable: boolean;
  }>;
}

/* ── History ── */

/**
 * GET /api/documents?page=1&limit=20&search=
 */
export interface HistoryListResponse {
  documents: HistoryDocumentSummary[];
  total:     number;
  page:      number;
  limit:     number;
}

export interface HistoryDocumentSummary {
  id:             string;
  documentId:     string;
  documentName:   string;
  lenderName:     string;
  analyzedAt:     string;   // ISO 8601
  riskLevel:      RiskLevel;
  riskScore:      number;
  predatoryScore: number;
  fileSize:       string;
  rbiViolations:  number;
  statedRate:     number;
  effectiveRate:  number;
  loanAmount:     number;
  tenure:         number;
  totalRepayable: number;
  clauseBreakdown: {
    critical: number;
    high:     number;
    medium:   number;
    low:      number;
  };
  keyFlags: string[];
  demographics: {
    businessName:      string;
    sector:            string;
    yearsInOperation:  number;
    annualTurnover:    string;
    state:             string;
    borrowerType:      'Micro' | 'Small' | 'Medium';
    loanPurpose:       string;
    firstTimeBorrower: boolean;
  };
}

/* ── Error ── */

export interface ApiError {
  code:    string;
  message: string;
  details?: unknown;
}
