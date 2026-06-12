/**
 * GET /api/documents?page=1&limit=20&search=
 *
 * Returns paginated history of analyzed documents, served from the
 * FastAPI backend's persistent store (GET /analyses).
 */

import { NextRequest, NextResponse } from 'next/server';
import { mapAnalysisSummary } from '@/lib/history-mapper';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export async function DELETE() {
  try {
    const res = await fetch(`${BACKEND_URL}/analyses`, { method: 'DELETE' });
    if (!res.ok) {
      return NextResponse.json(
        { code: 'CLEAR_FAILED', message: 'Could not clear history.' },
        { status: res.status },
      );
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', message: 'Could not reach the analysis backend.' },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page   = parseInt(searchParams.get('page')  ?? '1',  10);
  const limit  = parseInt(searchParams.get('limit') ?? '20', 10);
  const search = searchParams.get('search') ?? '';

  try {
    const qs = new URLSearchParams({
      page:      String(page),
      page_size: String(limit),
      search,
    });
    const res = await fetch(`${BACKEND_URL}/analyses?${qs}`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json(
        { code: 'BACKEND_ERROR', message: `History fetch failed: ${res.statusText}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    const documents = (data.items ?? []).map(mapAnalysisSummary);
    return NextResponse.json({ documents, total: data.total ?? 0, page, limit });
  } catch {
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', message: 'Could not reach the analysis backend. Is it running on port 8000?' },
      { status: 502 },
    );
  }
}
