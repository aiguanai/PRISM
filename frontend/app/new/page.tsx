'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UploadArea } from '@/components/upload/upload-area';
import { ProcessingTimeline } from '@/components/processing/processing-timeline';
import { ResultsDashboard } from '@/components/results/results-dashboard';
import { AlertTriangle } from 'lucide-react';
import { uploadDocument, startAnalysis, getJobStatus, getAnalysisResult } from '@/lib/api';
import type { DocumentAnalysis } from '@/lib/types';

type ViewState = 'upload' | 'processing' | 'results' | 'error';
type Phase = 'scanning' | 'extracting' | 'analyzing' | 'intelligence' | 'complete';

export default function NewAnalysisPage() {
  const [view, setView]         = useState<ViewState>('upload');
  const [phase, setPhase]       = useState<Phase>('scanning');
  const [progress, setProgress] = useState(0);
  const [message, setMessage]   = useState('Scanning document structure');
  const [eta, setEta]           = useState(45);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const handleAnalyze = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];

    setView('processing');
    setPhase('scanning');
    setProgress(5);
    setMessage('Uploading document…');
    setEta(45);
    setError(null);

    try {
      // 1. Upload
      const uploadRes = await uploadDocument(file);
      setDocumentId(uploadRes.documentId);
      setProgress(15);
      setPhase('extracting');
      setMessage('Extracting text and clauses…');
      setEta(35);

      // 2. Start analysis
      const analyzeRes = await startAnalysis(uploadRes.documentId);
      const jobId = analyzeRes.jobId;

      // 3. Poll status — backend is synchronous so it usually finishes in one tick
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const status = await getJobStatus(jobId);

            // Drive progress bar through the 4 analysis phases
            if (status.phase === 'scanning')     { setPhase('scanning');     setProgress(20); setMessage('Scanning document structure'); setEta(30); }
            if (status.phase === 'extracting')   { setPhase('extracting');   setProgress(40); setMessage('Extracting interest rates, fees & key terms'); setEta(20); }
            if (status.phase === 'analyzing')    { setPhase('analyzing');    setProgress(65); setMessage('Checking clauses against RBI Fair Practices Code'); setEta(12); }
            if (status.phase === 'intelligence') { setPhase('intelligence'); setProgress(85); setMessage('Generating AI insights & recommendations'); setEta(5);  }

            if (status.status === 'complete') {
              stopPolling();
              setPhase('complete');
              setProgress(100);
              setMessage('Analysis complete');
              setEta(0);
              resolve();
            } else if (status.status === 'failed') {
              stopPolling();
              reject(new Error(status.error ?? 'Analysis failed'));
            } else if (attempts > 60) {
              // 60 s timeout
              stopPolling();
              reject(new Error('Analysis timed out. Please try again.'));
            }
          } catch (e) {
            stopPolling();
            reject(e);
          }
        }, 1000);
      });

      // 4. Fetch results
      setMessage('Loading report…');
      const resultData = await getAnalysisResult(uploadRes.documentId);
      setAnalysis(resultData.analysis);

      // Brief pause so "complete" state is visible before switching to results
      await new Promise(r => setTimeout(r, 600));
      setView('results');

    } catch (err: any) {
      stopPolling();
      setError(err?.message ?? 'Something went wrong. Please try again.');
      setView('error');
    }
  }, []);

  const reset = () => {
    stopPolling();
    setView('upload');
    setPhase('scanning');
    setProgress(0);
    setMessage('');
    setAnalysis(null);
    setDocumentId(null);
    setError(null);
  };

  return (
    <DashboardLayout>
      <main className="relative p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto min-h-screen">
        <AnimatePresence mode="wait">

          {/* ── Upload ── */}
          {view === 'upload' && (
            <motion.div
              key="upload"
              className="relative z-10 space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">New Analysis</h1>
                <p className="text-muted-foreground">
                  Upload an MSME loan agreement to detect predatory clauses and RBI violations.
                </p>
              </div>
              <UploadArea onFileSelect={() => {}} onAnalyze={handleAnalyze} />
            </motion.div>
          )}

          {/* ── Processing ── */}
          {view === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <ProcessingTimeline
                currentPhase={phase}
                progress={Math.round(progress)}
                message={message}
                estimatedTimeRemaining={eta}
              />
            </motion.div>
          )}

          {/* ── Results ── */}
          {view === 'results' && analysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <ResultsDashboard analysis={analysis} documentId={documentId ?? undefined} />
              <motion.div
                className="mt-8 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  onClick={reset}
                  className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-md"
                  whileHover={{ scale: 1.03, boxShadow: 'var(--shadow-lg)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Analyse Another Document
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* ── Error ── */}
          {view === 'error' && (
            <motion.div
              key="error"
              className="relative z-10 flex flex-col items-center justify-center min-h-[50vh] gap-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center space-y-3 max-w-md">
                <div className="w-14 h-14 mx-auto rounded-full bg-sev-critical-bg border border-sev-critical-border flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-sev-critical" />
                </div>
                <h3 className="text-xl font-bold text-sev-critical">Analysis Failed</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Make sure the backend is running:&nbsp;
                  <code className="num bg-primary/6 px-2 py-0.5 rounded text-primary">
                    uvicorn main:app --reload --port 8000
                  </code>
                </p>
              </div>
              <motion.button
                onClick={reset}
                className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold shadow-md"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Try Again
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </DashboardLayout>
  );
}
