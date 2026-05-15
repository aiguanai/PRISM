import { NextRequest, NextResponse } from 'next/server';
import { fileStore, resultStore } from '@/lib/store';

const BACKEND_URL   = process.env.BACKEND_URL ?? 'http://localhost:8000';
const TIMEOUT_MS    = 5 * 60 * 1000; // 5 minutes — large docs with GPT can be slow

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;

  const pending = fileStore.get(documentId);
  if (!pending) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: `Document ${documentId} not found. Upload the file first.` },
      { status: 404 },
    );
  }

  try {
    const form = new FormData();
    const blob = new Blob([pending.buffer], { type: pending.type });
    form.append('file', blob, pending.name);

    const res = await fetch(`${BACKEND_URL}/analyze`, {
      method: 'POST',
      body:   form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail ?? body.message ?? detail;
      } catch { /* ignore */ }
      return NextResponse.json(
        { code: 'BACKEND_ERROR', message: `Analysis failed: ${detail}` },
        { status: res.status },
      );
    }

    const backendResponse = await res.json();

    resultStore.set(documentId, {
      backendResponse,
      documentName: pending.name,
      completedAt:  new Date().toISOString(),
    });

    fileStore.delete(documentId);

    return NextResponse.json({
      jobId:      documentId,
      documentId,
      status:     'complete',
    });

  } catch (err: any) {
    console.error('[analyze] pipeline error:', err);
    const isTimeout = err?.name === 'TimeoutError' || err?.code === 'UND_ERR_CONNECT_TIMEOUT';
    return NextResponse.json(
      {
        code:    isTimeout ? 'TIMEOUT' : 'INTERNAL_ERROR',
        message: isTimeout
          ? 'Analysis timed out. Try a shorter document or check backend logs.'
          : `Analysis failed: ${err?.message ?? 'Unknown error'}`,
      },
      { status: 500 },
    );
  }
}
