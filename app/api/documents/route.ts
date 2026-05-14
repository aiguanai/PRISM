/**
 * GET /api/documents?page=1&limit=20&search=
 *
 * Returns paginated history of analyzed documents.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page   = parseInt(searchParams.get('page')  ?? '1',  10);
  const limit  = parseInt(searchParams.get('limit') ?? '20', 10);
  const search = searchParams.get('search') ?? '';

  // ── Production ────────────────────────────────────────────────────────
  // const qs = new URLSearchParams({ page: String(page), limit: String(limit), search });
  // const res = await fetch(
  //   `${process.env.BACKEND_URL}/documents?${qs}`,
  //   { headers: { Authorization: `Bearer ${process.env.BACKEND_API_KEY}` } },
  // );
  // if (!res.ok) return NextResponse.json(await res.json(), { status: res.status });
  // return NextResponse.json(await res.json());
  // ─────────────────────────────────────────────────────────────────────

  const { mockHistoryDocuments } = await import('@/lib/mock-data');

  const filtered = search
    ? mockHistoryDocuments.filter(
        d =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.lenderName.toLowerCase().includes(search.toLowerCase()) ||
          d.demographics.businessName.toLowerCase().includes(search.toLowerCase()),
      )
    : mockHistoryDocuments;

  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  // Map to wire format
  const documents = paged.map(d => ({
    id:             d.id,
    documentId:     d.id,
    documentName:   d.name,
    lenderName:     d.lenderName,
    analyzedAt:     d.analyzedAt.toISOString(),
    riskLevel:      d.riskLevel,
    riskScore:      d.riskScore,
    predatoryScore: d.predatoryScore,
    fileSize:       d.size,
    rbiViolations:  d.rbiViolations,
    statedRate:     d.statedRate,
    effectiveRate:  d.effectiveRate,
    loanAmount:     d.loanAmount,
    tenure:         d.tenure,
    totalRepayable: d.totalRepayable,
    clauseBreakdown: d.clauseBreakdown,
    keyFlags:       d.keyFlags,
    demographics:   d.demographics,
  }));

  return NextResponse.json({ documents, total: filtered.length, page, limit });
}
