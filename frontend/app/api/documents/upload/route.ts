import { NextRequest, NextResponse } from 'next/server';
import { fileStore } from '@/lib/store';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { code: 'MISSING_FILE', message: 'No file in "file" field.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { code: 'INVALID_TYPE', message: `File type "${file.type}" not supported. Upload PDF, DOCX, or TXT.` },
        { status: 415 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { code: 'FILE_TOO_LARGE', message: 'File exceeds 25 MB limit.' },
        { status: 413 },
      );
    }

    const documentId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const arrayBuffer = await file.arrayBuffer();

    fileStore.set(documentId, {
      name:       file.name,
      type:       file.type,
      size:       file.size,
      buffer:     Buffer.from(arrayBuffer),
      uploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      documentId,
      fileName:   file.name,
      fileSize:   file.size,
      mimeType:   file.type,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Upload failed.' },
      { status: 500 },
    );
  }
}
