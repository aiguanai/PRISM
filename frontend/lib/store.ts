/**
 * In-memory store for the Next.js → FastAPI proxy layer.
 *
 * Uses globalThis so the Maps survive Next.js Hot Module Replacement in dev.
 * Without this, a hot reload between the analyze call and the analysis call
 * wipes the Maps and causes "Analysis not ready" 404s.
 */

export interface PendingFile {
  name:       string;
  type:       string;
  size:       number;
  buffer:     Buffer;
  uploadedAt: string;
}

export interface StoredResult {
  backendResponse: Record<string, unknown>;
  documentName:    string;
  completedAt:     string;
}

declare global {
  // eslint-disable-next-line no-var
  var __prism_fileStore:   Map<string, PendingFile>   | undefined;
  // eslint-disable-next-line no-var
  var __prism_resultStore: Map<string, StoredResult>  | undefined;
}

export const fileStore: Map<string, PendingFile> =
  globalThis.__prism_fileStore ?? (globalThis.__prism_fileStore = new Map());

export const resultStore: Map<string, StoredResult> =
  globalThis.__prism_resultStore ?? (globalThis.__prism_resultStore = new Map());
