/**
 * PRISM API Client
 *
 * All backend calls go through this file.
 * Set NEXT_PUBLIC_API_URL in .env.local to point at your backend.
 * When USE_MOCK_DATA=true (default in dev) every call returns mock data
 * so the UI works without a running backend.
 */

import type {
  UploadResponse,
  AnalyzeResponse,
  JobStatusResponse,
  AnalysisResultResponse,
  HistoryListResponse,
  HistoryDocumentSummary,
  ApiError,
} from './api-types';

import {
  mockAnalysisResult,
  mockIntelligenceInsights,
  mockHistoryDocuments,
  mockProcessingStatuses,
} from './mock-data';

import type { DocumentAnalysis, HistoryDocument, IntelligenceInsight } from './types';

/* ── Config ── */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? '/api';

const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false';

/* ── Helpers ── */

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    let err: ApiError;
    try { err = await res.json(); }
    catch { err = { code: String(res.status), message: res.statusText }; }
    throw new PrismApiError(err.message, err.code, res.status);
  }

  return res.json() as Promise<T>;
}

export class PrismApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'PrismApiError';
  }
}

/* ─────────────────────────────────────────────
   1. Upload a document
   POST /api/documents/upload
   ───────────────────────────────────────────── */

export async function uploadDocument(file: File): Promise<UploadResponse> {
  if (USE_MOCK) {
    await delay(800);
    return {
      documentId: `doc-${Date.now()}`,
      fileName:   file.name,
      fileSize:   file.size,
      mimeType:   file.type,
      uploadedAt: new Date().toISOString(),
    };
  }

  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    body: form,
    // Do NOT set Content-Type — browser sets multipart boundary automatically
  });

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      code: String(res.status),
      message: res.statusText,
    }));
    throw new PrismApiError(err.message, err.code, res.status);
  }

  return res.json();
}

/* ─────────────────────────────────────────────
   2. Start analysis job
   POST /api/documents/:documentId/analyze
   ───────────────────────────────────────────── */

export async function startAnalysis(documentId: string): Promise<AnalyzeResponse> {
  if (USE_MOCK) {
    await delay(300);
    return {
      jobId:      `job-${Date.now()}`,
      documentId,
      status:     'queued',
    };
  }

  return request<AnalyzeResponse>(`/documents/${documentId}/analyze`, {
    method: 'POST',
    body: JSON.stringify({ documentId }),
  });
}

/* ─────────────────────────────────────────────
   3. Poll job status
   GET /api/jobs/:jobId/status
   ───────────────────────────────────────────── */

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  if (USE_MOCK) {
    // Simulate phase progression based on elapsed time stored in jobId timestamp
    const elapsed = Date.now() - parseInt(jobId.replace('job-', ''), 10);
    const phase = getSimulatedPhase(elapsed);
    const status = mockProcessingStatuses.find(s => s.phase === phase)
      ?? mockProcessingStatuses[0];
    return {
      jobId,
      documentId: 'mock-doc',
      phase:      status.phase,
      progress:   status.progress,
      message:    status.message,
      estimatedTimeRemaining: status.estimatedTimeRemaining,
      status:     phase === 'complete' ? 'complete' : 'processing',
    };
  }

  return request<JobStatusResponse>(`/jobs/${jobId}/status`);
}

/* ─────────────────────────────────────────────
   4. Get full analysis result
   GET /api/documents/:documentId/analysis
   ───────────────────────────────────────────── */

export async function getAnalysisResult(
  documentId: string,
): Promise<{ analysis: DocumentAnalysis; insights: IntelligenceInsight[] }> {
  if (USE_MOCK) {
    await delay(200);
    return {
      analysis: mockAnalysisResult,
      insights: mockIntelligenceInsights,
    };
  }

  const raw = await request<AnalysisResultResponse>(
    `/documents/${documentId}/analysis`,
  );

  return {
    analysis: mapAnalysisResponse(raw),
    insights: raw.insights,
  };
}

/* ─────────────────────────────────────────────
   5. List history
   GET /api/documents?page=1&limit=20&search=
   ───────────────────────────────────────────── */

export async function getHistory(params?: {
  page?:   number;
  limit?:  number;
  search?: string;
}): Promise<{ documents: HistoryDocument[]; total: number }> {
  if (USE_MOCK) {
    await delay(400);
    const search = params?.search?.toLowerCase() ?? '';
    const filtered = search
      ? mockHistoryDocuments.filter(
          d =>
            d.name.toLowerCase().includes(search) ||
            d.lenderName.toLowerCase().includes(search) ||
            d.demographics.businessName.toLowerCase().includes(search),
        )
      : mockHistoryDocuments;
    return { documents: filtered, total: filtered.length };
  }

  const qs = new URLSearchParams({
    page:   String(params?.page  ?? 1),
    limit:  String(params?.limit ?? 20),
    search: params?.search ?? '',
  });

  const raw = await request<HistoryListResponse>(`/documents?${qs}`);

  // For each summary we need the full analysis — fetch lazily when panel opens
  const documents: HistoryDocument[] = raw.documents.map(mapHistorySummary);
  return { documents, total: raw.total };
}

/* ─────────────────────────────────────────────
   6. Get single history document (with full analysis)
   GET /api/documents/:id
   ───────────────────────────────────────────── */

export async function getHistoryDocument(id: string): Promise<HistoryDocument> {
  if (USE_MOCK) {
    await delay(200);
    const doc = mockHistoryDocuments.find(d => d.id === id);
    if (!doc) throw new PrismApiError('Document not found', 'NOT_FOUND', 404);
    return doc;
  }

  // Fetch summary + analysis in parallel
  const [summary, analysisData] = await Promise.all([
    request<HistoryDocumentSummary>(`/documents/${id}`),
    request<AnalysisResultResponse>(`/documents/${id}/analysis`),
  ]);

  return {
    ...mapHistorySummary(summary),
    analysis: mapAnalysisResponse(analysisData),
  };
}

/* ─────────────────────────────────────────────
   Mappers — API wire format → UI types
   ───────────────────────────────────────────── */

function mapAnalysisResponse(raw: AnalysisResultResponse): DocumentAnalysis {
  return {
    ...raw,
    analyzedAt: new Date(raw.analyzedAt),
  };
}

function mapHistorySummary(s: HistoryDocumentSummary): HistoryDocument {
  return {
    id:             s.id,
    name:           s.documentName,
    lenderName:     s.lenderName,
    analyzedAt:     new Date(s.analyzedAt),
    riskLevel:      s.riskLevel,
    riskScore:      s.riskScore,
    predatoryScore: s.predatoryScore,
    size:           s.fileSize,
    clauseBreakdown: s.clauseBreakdown,
    rbiViolations:  s.rbiViolations,
    statedRate:     s.statedRate,
    effectiveRate:  s.effectiveRate,
    loanAmount:     s.loanAmount,
    tenure:         s.tenure,
    totalRepayable: s.totalRepayable,
    demographics:   s.demographics,
    keyFlags:       s.keyFlags,
    // Full analysis loaded on demand via getHistoryDocument()
    analysis:       mockAnalysisResult, // placeholder until loaded
  };
}

/* ─────────────────────────────────────────────
   Utilities
   ───────────────────────────────────────────── */

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSimulatedPhase(
  elapsedMs: number,
): 'scanning' | 'extracting' | 'analyzing' | 'intelligence' | 'complete' {
  if (elapsedMs < 1500)  return 'scanning';
  if (elapsedMs < 4000)  return 'extracting';
  if (elapsedMs < 8000)  return 'analyzing';
  if (elapsedMs < 11000) return 'intelligence';
  return 'complete';
}
