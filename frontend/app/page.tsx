'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UploadArea } from '@/components/upload/upload-area';
import { ProcessingTimeline } from '@/components/processing/processing-timeline';
import { LiveDocumentScanner } from '@/components/processing/live-document-scanner';
import { ResultsDashboard } from '@/components/results/results-dashboard';
import { CountUp } from '@/components/ui/count-up';
import { uploadDocument, startAnalysis, getJobStatus, getAnalysisResult, getHistory } from '@/lib/api';
import type { DocumentAnalysis, HistoryDocument } from '@/lib/types';
import {
  Brain, ArrowRight, TrendingUp, AlertTriangle, Percent, Lock, FileWarning,
  FileSearch, ShieldAlert, Files,
} from 'lucide-react';

type ViewState = 'upload' | 'processing' | 'results';

const EASE = [0.22, 1, 0.36, 1] as const;

const features = [
  { icon: AlertTriangle, title: 'Predatory Clause Detection',  description: 'Flags exploitative terms like excessive penal interest, blanket liens, and one-sided prepayment penalties.' },
  { icon: Percent,       title: 'Hidden Cost Exposure',        description: 'Uncovers disguised fees, compounding traps, and charges buried in fine print.' },
  { icon: Lock,          title: 'Collateral & Lien Analysis',  description: 'Identifies overreaching collateral demands and personal guarantee traps.' },
  { icon: FileWarning,   title: 'RBI Compliance Check',        description: 'Cross-references terms against RBI Fair Practices Code and MSME lending guidelines.' },
  { icon: Brain,         title: 'Plain-Language Summaries',    description: 'Translates dense legalese into clear explanations you can act on.' },
  { icon: TrendingUp,    title: 'Explainable Flags',           description: 'Shows the exact words that triggered each flag, so every finding can be verified against the document.' },
];

/* ── Aggregate stats from real history ─────────────────────────────── */
interface HomeStats {
  documents: number;
  flagged: number;
  rbi: number;
}

function aggregateStats(docs: HistoryDocument[], total: number): HomeStats {
  return {
    documents: total,
    flagged: docs.reduce((acc, d) => acc + (d.clauseBreakdown?.critical ?? 0) + (d.clauseBreakdown?.high ?? 0), 0),
    rbi: docs.reduce((acc, d) => acc + (d.rbiViolations ?? 0), 0),
  };
}

/* ── Data strip: signature stat cards ──────────────────────────────── */
function StatStrip({ stats }: { stats: HomeStats }) {
  const cards = [
    { label: 'Documents analyzed', value: stats.documents, icon: Files,       color: 'text-primary',      bar: 'bg-primary',      chip: 'bg-primary/8 border border-primary/15' },
    { label: 'Clauses flagged',    value: stats.flagged,   icon: FileSearch,  color: 'text-sev-high',     bar: 'bg-sev-high',     chip: 'bg-sev-high-bg border border-sev-high-border' },
    { label: 'RBI violations',     value: stats.rbi,       icon: ShieldAlert, color: 'text-sev-critical', bar: 'bg-sev-critical', chip: 'bg-sev-critical-bg border border-sev-critical-border' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            className="card-elevated relative p-6 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.08, duration: 0.45, ease: EASE }}
            whileHover={{ y: -3 }}
          >
            {/* Severity accent — thin top rule */}
            <div className={`absolute top-0 left-6 right-6 h-[2px] rounded-full ${card.bar}`} />
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-9 h-9 rounded-md ${card.chip} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="label-caps mb-1">{card.label}</p>
                <div className={`text-5xl font-bold leading-none ${card.color}`}>
                  <CountUp value={card.value} delay={0.35 + i * 0.1} />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [currentView, setCurrentView]          = useState<ViewState>('upload');
  const [processingPhase, setProcessingPhase]  = useState<
    'scanning' | 'extracting' | 'analyzing' | 'intelligence' | 'complete'
  >('scanning');
  const [progress, setProgress]                = useState(0);
  const [progressMessage, setProgressMessage]  = useState('');
  const [analysisResult, setAnalysisResult]    = useState<DocumentAnalysis | null>(null);
  const [documentId, setDocumentId]            = useState<string | null>(null);
  const [analysisError, setAnalysisError]      = useState<string | null>(null);
  const [stats, setStats]                      = useState<HomeStats | null>(null);

  // Real aggregate numbers for the data strip; null = no history yet / unreachable.
  useEffect(() => {
    let cancelled = false;
    getHistory({ page: 1, limit: 50 })
      .then((res) => {
        if (!cancelled && res.total > 0) setStats(aggregateStats(res.documents, res.total));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentView]);

  const handleFileSelect = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];

    setCurrentView('processing');
    setProcessingPhase('scanning');
    setProgress(0);
    setAnalysisError(null);

    try {
      const { documentId: docId } = await uploadDocument(file);
      setDocumentId(docId);
      const { jobId } = await startAnalysis(docId);
      await pollJobStatus(jobId, docId);
    } catch (err: any) {
      console.error('[PRISM] Analysis failed:', err);
      setAnalysisError(err?.message ?? 'Analysis failed. Please try again.');
      setCurrentView('upload');
    }
  }, []);

  async function pollJobStatus(jobId: string, documentId: string) {
    const POLL_INTERVAL = 600; // ms

    return new Promise<void>((resolve, reject) => {
      const tick = async () => {
        try {
          const status = await getJobStatus(jobId);

          setProcessingPhase(status.phase);
          setProgress(status.progress);
          setProgressMessage(status.message);

          if (status.status === 'failed') {
            reject(new Error(status.error ?? 'Analysis failed'));
            return;
          }

          if (status.status === 'complete') {
            const { analysis } = await getAnalysisResult(documentId);
            setAnalysisResult(analysis);
            setCurrentView('results');
            resolve();
            return;
          }

          setTimeout(tick, POLL_INTERVAL);
        } catch (err) {
          reject(err);
        }
      };

      tick();
    });
  }

  return (
    <DashboardLayout>
      <main className="relative min-h-screen">
        <AnimatePresence mode="wait">
          {/* ── UPLOAD VIEW ── */}
          {currentView === 'upload' && (
            <motion.div
              key="upload"
              className="relative z-10 px-4 sm:px-6 lg:px-10 py-10 max-w-5xl mx-auto space-y-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {/* Error banner */}
              {analysisError && (
                <motion.div
                  className="rounded-lg border border-sev-critical-border bg-sev-critical-bg p-4 flex items-start gap-3"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertTriangle className="w-4 h-4 text-sev-critical flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-sev-critical">Analysis failed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{analysisError}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check the backend is running:&nbsp;
                      <code className="num bg-primary/5 px-1.5 py-0.5 rounded text-foreground">
                        uvicorn main:app --reload --port 8000
                      </code>
                    </p>
                  </div>
                  <button
                    onClick={() => setAnalysisError(null)}
                    aria-label="Dismiss error"
                    className="text-muted-foreground hover:text-foreground text-lg flex-shrink-0"
                  >×</button>
                </motion.div>
              )}

              {/* ── Compact hero strip ── */}
              <div className="text-center space-y-5 pt-2">
                <motion.div
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent/8"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="label-caps !text-[10px] !text-gold-text">
                    Document risk intelligence for MSMEs
                  </span>
                </motion.div>

                <motion.h1
                  className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-foreground leading-[1.08]"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.5, ease: EASE }}
                >
                  Know what you&apos;re signing.
                  <br />
                  <span className="text-primary">Before it costs you.</span>
                </motion.h1>

                <motion.p
                  className="text-[15px] sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.45 }}
                >
                  Upload a loan agreement. PRISM flags predatory clauses, hidden charges,
                  and RBI violations in <b>plain language</b>.
                </motion.p>

                <motion.div
                  className="hairline-gold max-w-xs mx-auto"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
                />
              </div>

              {/* ── Data strip (real numbers) — shown once history exists ── */}
              {stats && <StatStrip stats={stats} />}

              {/* ── Upload ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.45, ease: EASE }}
              >
                <UploadArea onFileSelect={() => {}} onAnalyze={handleFileSelect} />
              </motion.div>

              {/* ── Features ── */}
              <motion.div
                className="space-y-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <p className="label-caps flex-shrink-0">What we check</p>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {features.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <motion.div
                        key={f.title}
                        className="card-elevated p-5 group cursor-default"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + i * 0.06, duration: 0.4, ease: EASE }}
                        whileHover={{ y: -3 }}
                      >
                        <div className="w-8 h-8 rounded-md bg-primary/6 border border-primary/12 flex items-center justify-center mb-3 text-primary group-hover:bg-accent/12 group-hover:border-accent/30 group-hover:text-gold-text transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1.5">{f.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── PROCESSING VIEW ── */}
          {currentView === 'processing' && (
            <motion.div
              key="processing"
              className="relative z-10 px-4 sm:px-6 lg:px-10 py-10 max-w-5xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <ProcessingTimeline
                  currentPhase={processingPhase}
                  progress={Math.round(progress)}
                  message={progressMessage || (
                    processingPhase === 'scanning'      ? 'Scanning document structure and content'
                    : processingPhase === 'extracting'  ? 'Extracting clauses and key terms'
                    : processingPhase === 'analyzing'   ? 'Analyzing legal and financial implications'
                    : processingPhase === 'intelligence'? 'Preparing final analyst review and recommendations'
                    : 'Analysis complete'
                  )}
                  estimatedTimeRemaining={Math.max(0, 15 - Math.round(progress / 5))}
                />

                <div className="hidden md:block">
                  <LiveDocumentScanner progress={Math.round(progress)} phase={processingPhase} />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── RESULTS VIEW ── */}
          {currentView === 'results' && (
            <motion.div
              key="results"
              className="relative z-10 px-4 sm:px-6 lg:px-10 py-10 max-w-6xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <ResultsDashboard analysis={analysisResult!} documentId={documentId ?? undefined} />
              <motion.div
                className="mt-10 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  onClick={() => setCurrentView('upload')}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm bg-primary text-primary-foreground shadow-md"
                  whileHover={{ scale: 1.03, boxShadow: 'var(--shadow-lg)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Analyze Another Document
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </DashboardLayout>
  );
}
