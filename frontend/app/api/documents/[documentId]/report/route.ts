import { NextRequest, NextResponse } from 'next/server';
import { resultStore } from '@/lib/store';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;

  const stored = resultStore.get(documentId);
  if (!stored) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Analysis not found.' }, { status: 404 });
  }

  const reportId = (stored.backendResponse as any)?.report_id;
  if (!reportId) {
    return NextResponse.json({ code: 'NO_REPORT', message: 'PDF report was not generated.' }, { status: 404 });
  }

  // Proxy to Python backend
  const res = await fetch(`${BACKEND_URL}/report/${reportId}`);
  if (!res.ok) {
    return NextResponse.json({ code: 'BACKEND_ERROR', message: 'Report fetch failed.' }, { status: res.status });
  }

  const pdf = await res.arrayBuffer();
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="PRISM_Report_${documentId.slice(0, 8)}.pdf"`,
    },
  });
}
