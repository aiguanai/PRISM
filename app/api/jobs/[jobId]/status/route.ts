/**
 * GET /api/jobs/:jobId/status
 *
 * Polled by the client every ~500ms to drive the processing timeline.
 * In production, proxy to your backend job queue.
 */

import { NextRequest, NextResponse } from 'next/server';

const PHASES = [
  { phase: 'scanning',     progress: 15,  message: 'Scanning loan document structure and clauses',         estimatedTimeRemaining: 45 },
  { phase: 'extracting',   progress: 35,  message: 'Extracting interest rates, fees, and key terms',       estimatedTimeRemaining: 30 },
  { phase: 'analyzing',    progress: 65,  message: 'Checking clauses against RBI Fair Practices Code',     estimatedTimeRemaining: 15 },
  { phase: 'intelligence', progress: 85,  message: 'Calculating true cost and generating recommendations', estimatedTimeRemaining: 5  },
  { phase: 'complete',     progress: 100, message: 'Analysis complete',                                    estimatedTimeRemaining: 0  },
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const { jobId } = params;

  // ── Production ────────────────────────────────────────────────────────
  // const res = await fetch(
  //   `${process.env.BACKEND_URL}/jobs/${jobId}/status`,
  //   { headers: { Authorization: `Bearer ${process.env.BACKEND_API_KEY}` } },
  // );
  // if (!res.ok) return NextResponse.json(await res.json(), { status: res.status });
  // return NextResponse.json(await res.json());
  // ─────────────────────────────────────────────────────────────────────

  // Stub — simulate phase progression from the timestamp embedded in jobId
  const ts = parseInt(jobId.replace('job-', ''), 10);
  const elapsed = isNaN(ts) ? 12000 : Date.now() - ts;

  let phase = PHASES[0];
  if      (elapsed >= 11000) phase = PHASES[4];
  else if (elapsed >= 8000)  phase = PHASES[3];
  else if (elapsed >= 4000)  phase = PHASES[2];
  else if (elapsed >= 1500)  phase = PHASES[1];

  return NextResponse.json({
    jobId,
    documentId: 'mock-doc',
    phase:      phase.phase,
    progress:   phase.progress,
    message:    phase.message,
    estimatedTimeRemaining: phase.estimatedTimeRemaining,
    status:     phase.phase === 'complete' ? 'complete' : 'processing',
  });
}
