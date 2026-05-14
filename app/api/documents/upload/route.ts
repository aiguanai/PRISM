/**
 * POST /api/documents/upload
 *
 * Accepts a multipart/form-data request with a "file" field.
 * In production, forward the file to your backend service.
 * This stub validates the request and returns a mock response so
 * the frontend can be tested end-to-end without a real backend.
 */

import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { code: 'MISSING_FILE', message: 'No file provided in the "file" field.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { code: 'INVALID_TYPE', message: `File type "${file.type}" is not supported. Upload a PDF, DOCX, or TXT.` },
        { status: 415 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { code: 'FILE_TOO_LARGE', message: 'File exceeds the 50 MB limit.' },
        { status: 413 },
      );
    }

    // ── Production: forward to your backend ──────────────────────────────
    // const backendForm = new FormData();
    // backendForm.append('file', file);
    // const res = await fetch(`${process.env.BACKEND_URL}/documents/upload`, {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${process.env.BACKEND_API_KEY}` },
    //   body: backendForm,
    // });
    // if (!res.ok) return NextResponse.json(await res.json(), { status: res.status });
    // return NextResponse.json(await res.json());
    // ─────────────────────────────────────────────────────────────────────

    // Stub response
    return NextResponse.json({
      documentId: `doc-${Date.now()}`,
      fileName:   file.name,
      fileSize:   file.size,
      mimeType:   file.type,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[upload] unexpected error', err);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Upload failed. Please try again.' },
      { status: 500 },
    );
  }
}
