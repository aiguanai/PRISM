/**
 * POST /api/documents/:documentId/analyze
 *
 * Kicks off an analysis job for the given document.
 * Returns a jobId the client uses to poll for progress.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { documentId: string } },
) {
  const { documentId } = params;

  if (!documentId) {
    return NextResponse.json(
      { code: 'MISSING_PARAM', message: 'documentId is required.' },
      { status: 400 },
    );
  }

  // ── Production: call your AI backend ─────────────────────────────────
  // const res = await fetch(`${process.env.BACKEND_URL}/documents/${documentId}/analyze`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bearer ${process.env.BACKEND_API_KEY}`,
  //   },
  // });
  // if (!res.ok) return NextResponse.json(await res.json(), { status: res.status });
  // return NextResponse.json(await res.json());
  // ─────────────────────────────────────────────────────────────────────

  return NextResponse.json({
    jobId:      `job-${Date.now()}`,
    documentId,
    status:     'queued',
  });
}
