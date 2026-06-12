/**
 * GET    /api/documents/:documentId — single history summary
 * DELETE /api/documents/:documentId — remove an analysis + its report
 */

import { NextRequest, NextResponse } from 'next/server';
import { mapAnalysisSummary } from '@/lib/history-mapper';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/analyses/${documentId}`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Analysis not found.' },
        { status: res.status },
      );
    }
    return NextResponse.json(mapAnalysisSummary(await res.json()));
  } catch {
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', message: 'Could not reach the analysis backend.' },
      { status: 502 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/analyses/${documentId}`, { method: 'DELETE' });
    if (!res.ok) {
      return NextResponse.json(
        { code: 'DELETE_FAILED', message: 'Could not delete the analysis.' },
        { status: res.status },
      );
    }
    return NextResponse.json({ status: 'deleted', id: documentId });
  } catch {
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', message: 'Could not reach the analysis backend.' },
      { status: 502 },
    );
  }
}
