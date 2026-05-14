/**
 * GET /api/documents/:documentId/analysis
 *
 * Returns the full analysis result for a completed job.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } },
) {
  const { documentId } = params;

  // ── Production ────────────────────────────────────────────────────────
  // const res = await fetch(
  //   `${process.env.BACKEND_URL}/documents/${documentId}/analysis`,
  //   { headers: { Authorization: `Bearer ${process.env.BACKEND_API_KEY}` } },
  // );
  // if (!res.ok) return NextResponse.json(await res.json(), { status: res.status });
  // return NextResponse.json(await res.json());
  // ─────────────────────────────────────────────────────────────────────

  // Stub — import mock only in this route so tree-shaking removes it in prod
  const { mockAnalysisResult, mockIntelligenceInsights } = await import(
    '@/lib/mock-data'
  );

  return NextResponse.json({
    ...mockAnalysisResult,
    documentId,
    analyzedAt: new Date().toISOString(),
    insights:   mockIntelligenceInsights,
  });
}
