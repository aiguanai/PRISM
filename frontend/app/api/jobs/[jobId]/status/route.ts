import { NextRequest, NextResponse } from 'next/server';
import { resultStore } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  // jobId === documentId (set by the analyze route)
  const result = resultStore.get(jobId);

  if (result) {
    return NextResponse.json({
      jobId,
      documentId:             jobId,
      phase:                  'complete',
      progress:               100,
      message:                'Analysis complete',
      estimatedTimeRemaining: 0,
      status:                 'complete',
    });
  }

  // Result not ready yet — return a mid-progress state
  return NextResponse.json({
    jobId,
    documentId:             jobId,
    phase:                  'analyzing',
    progress:               65,
    message:                'Checking clauses against RBI Fair Practices Code',
    estimatedTimeRemaining: 10,
    status:                 'processing',
  });
}
