/**
 * GET /api/backend-health — proxy to the FastAPI /health endpoint
 * so the settings page can show backend connectivity status.
 */

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(res.statusText);
    return NextResponse.json({ status: 'healthy', backendUrl: BACKEND_URL });
  } catch {
    return NextResponse.json(
      { status: 'unreachable', backendUrl: BACKEND_URL },
      { status: 502 },
    );
  }
}
