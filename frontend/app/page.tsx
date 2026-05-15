'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UploadArea } from '@/components/upload/upload-area';
import { ProcessingTimeline } from '@/components/processing/processing-timeline';
import { LiveDocumentScanner } from '@/components/processing/live-document-scanner';
import { ResultsDashboard } from '@/components/results/results-dashboard';
import { uploadDocument, startAnalysis, getJobStatus, getAnalysisResult } from '@/lib/api';
import type { DocumentAnalysis } from '@/lib/types';
import { Shield, Zap, Brain, ArrowRight, FileSearch, TrendingUp, AlertTriangle, Percent, Lock, FileWarning } from 'lucide-react';

type ViewState = 'upload' | 'processing' | 'results';

const features = [
  {
    icon: AlertTriangle,
    title: 'Predatory Clause Detection',
    description: 'Flags exploitative terms like excessive penal interest, blanket lien clauses, and one-sided prepayment penalties common in MSME loan agreements.',
    bg: '#fdf6f6', border: 'rgba(124,45,45,0.2)', iconColor: '#7c2d2d', iconBg: 'rgba(124,45,45,0.08)',
  },
  {
    icon: Percent,
    title: 'Hidden Cost Exposure',
    description: 'Uncovers disguised fees, compounding interest traps, and processing charges buried in fine print that inflate the true cost of borrowing.',
    bg: '#fdf9f0', border: 'rgba(138,92,0,0.2)', iconColor: '#8a5c00', iconBg: 'rgba(138,92,0,0.08)',
  },
  {
    icon: Lock,
    title: 'Collateral & Lien Analysis',
    description: 'Identifies overreaching collateral demands, personal guarantee traps, and asset seizure clauses that put business owners at disproportionate risk.',
    bg: '#fdf7f4', border: 'rgba(155,58,42,0.2)', iconColor: '#9b3a2a', iconBg: 'rgba(155,58,42,0.08)',
  },
  {
    icon: FileWarning,
    title: 'RBI Compliance Check',
    description: 'Cross-references loan terms against RBI Fair Practices Code and MSME lending guidelines to surface regulatory violations.',
    bg: '#f4f8f5', border: 'rgba(0,66,37,0.2)', iconColor: '#004225', iconBg: 'rgba(0,66,37,0.08)',
  },
  {
    icon: Brain,
    title: 'Plain-Language Summaries',
    description: 'Translates dense legalese into clear, jargon-free explanations so business owners understand exactly what they are signing.',
    bg: '#f6f8f4', border: 'rgba(45,106,79,0.2)', iconColor: '#2d6a4f', iconBg: 'rgba(45,106,79,0.08)',
  },
  {
    icon: TrendingUp,
    title: 'True Cost Calculator',
    description: 'Computes the effective annual rate and total repayment burden including all hidden charges, giving a real picture of loan affordability.',
    bg: '#fdfaf4', border: 'rgba(201,168,76,0.3)', iconColor: '#8a6a1a', iconBg: 'rgba(201,168,76,0.1)',
  },
];

/* Deterministic pseudo-random using a seeded LCG — same output on server and client */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}



/* Animated word reveal for headline */
function AnimatedHeadline() {
  const lines = [
    { text: 'Uncover Hidden Risks', gradient: false },
    { text: 'In MSME Loans', gradient: false },
    { text: 'Before You Sign.', gradient: false },
  ];
  return (
    <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.75rem] leading-[1.08] tracking-tight">
      {lines.map((line, li) => (
        <motion.div
          key={li}
          className="overflow-hidden block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 + li * 0.1 }}
        >
          <motion.span
            className={`block ${line.gradient ? 'gradient-text' : 'text-[#004225]'}`}
            initial={{ y: 48 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.15 + li * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {line.text}
          </motion.span>
        </motion.div>
      ))}
    </h1>
  );
}


export default function Home() {
  const [currentView, setCurrentView]       = useState<ViewState>('upload');
  const [processingPhase, setProcessingPhase] = useState<
    'scanning' | 'extracting' | 'analyzing' | 'intelligence' | 'complete'
  >('scanning');
  const [progress, setProgress]             = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysis | null>(null);
  const [documentId,    setDocumentId]      = useState<string | null>(null);
  const [analysisError, setAnalysisError]   = useState<string | null>(null);

  const handleFileSelect = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];

    setCurrentView('processing');
    setProcessingPhase('scanning');
    setProgress(0);
    setAnalysisError(null);

    try {
      // 1. Upload
      const { documentId: docId } = await uploadDocument(file);
      setDocumentId(docId);
      const documentId = docId;

      // 2. Start analysis job
      const { jobId } = await startAnalysis(documentId);

      // 3. Poll for progress
      await pollJobStatus(jobId, documentId);
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
            // Fetch full result
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

  const handleAnalyze = useCallback((files: File[]) => {
    handleFileSelect(files);
  }, [handleFileSelect]);

  return (
    <DashboardLayout>
      <main className="relative min-h-screen">
        {/* Fixed ambient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <motion.div
            className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,66,37,0.05) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
          <div className="absolute inset-0 dot-pattern opacity-30" />
        </div>

        <AnimatePresence mode="wait">
          {/* ── UPLOAD VIEW ── */}
          {currentView === 'upload' && (
            <motion.div
              key="upload"
              className="relative z-10 px-4 sm:px-6 lg:px-10 py-10 max-w-6xl mx-auto space-y-16"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Error banner */}
              {analysisError && (
                <motion.div
                  className="rounded-xl border border-[#7c2d2d]/30 bg-[#7c2d2d]/8 p-4 flex items-start gap-3"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="text-[#7c2d2d] text-lg flex-shrink-0">⚠</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#7c2d2d]">Analysis failed</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">{analysisError}</p>
                    <p className="text-xs text-[#6b7280] mt-1">
                      Check the backend is running:&nbsp;
                      <code className="bg-[rgba(0,66,37,0.08)] px-1.5 py-0.5 rounded font-mono text-[#004225]">
                        uvicorn main:app --reload --port 8000
                      </code>
                    </p>
                  </div>
                  <button
                    onClick={() => setAnalysisError(null)}
                    className="text-[#6b7280] hover:text-[#1a1f2e] text-lg flex-shrink-0"
                  >×</button>
                </motion.div>
              )}

              {/* Hero */}
              <div className="text-center space-y-6 pt-4 relative">
                {/* Eyebrow */}
                <motion.div
                  className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full"
                  style={{
                    border: '1px solid rgba(0,66,37,0.12)',
                    background: 'rgba(0,66,37,0.03)',
                    color: '#004225',
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.4 }}
                >
                  <motion.span
                    className="w-1 h-1 rounded-full"
                    style={{ background: '#c9a84c' }}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                  Expert Document Analysis For MSMEs
                </motion.div>

                {/* Animated headline */}
                <AnimatedHeadline />

                <motion.p
                  className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
                  style={{ color: '#6b7280', fontFamily: "'DM Serif Display', Georgia, serif" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  Upload your business loan agreements for a comprehensive, expert-level review. We help small and medium enterprises identify hidden fees, penal interest traps, and regulatory violations so you can secure fair credit terms.
                </motion.p>

                {/* Decorative animated line */}
                <motion.div
                  className="flex items-center justify-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {['Working Capital', 'Term Loans', 'Overdraft Facilities', 'Equipment Finance', 'Trade Credit'].map((tag, i) => (
                    <motion.span
                      key={tag}
                      className="hidden sm:inline-flex text-[11px] text-[#004225]/60 tracking-widest uppercase"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65 + i * 0.06 }}
                    >
                      {i > 0 && <span className="mx-3 text-[#004225]/20">·</span>}
                      {tag}
                    </motion.span>
                  ))}
                </motion.div>
              </div>

              {/* Upload area */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <UploadArea onFileSelect={handleFileSelect} onAnalyze={handleFileSelect} />              </motion.div>

              {/* Feature grid */}
              <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                {/* Divider */}
                <div className="flex items-center gap-4">
                  <motion.div
                    className="h-px flex-1"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(0,66,37,0.3))' }}
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.55, duration: 0.8 }}
                  />
                  <motion.p
                    className="text-xs text-muted-foreground/50 font-bold tracking-widest uppercase flex-shrink-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    Our Review Process Focuses On
                  </motion.p>
                  <motion.div
                    className="h-px flex-1"
                    style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' }}
                    initial={{ scaleX: 0, originX: 1 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.55, duration: 0.8 }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {features.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <motion.div
                        key={f.title}
                        className="relative rounded p-5 overflow-hidden group cursor-default"
                        style={{
                          background: f.bg,
                          border: `1px solid ${f.border}`,
                        }}
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.55 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        whileHover={{ y: -3, boxShadow: `0 8px 24px ${f.border}` }}
                      >
                        {/* Gold bottom line on hover */}
                        <div
                          className="absolute bottom-0 inset-x-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                          style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }}
                        />

                        <div
                          className="w-8 h-8 rounded flex items-center justify-center mb-3"
                          style={{ background: f.iconBg, color: f.iconColor }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <h3
                          className="text-sm mb-1.5"
                          style={{ color: '#1a1f2e', fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}
                        >
                          {f.title}
                        </h3>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: '#6b7280', fontFamily: "'DM Serif Display', Georgia, serif" }}
                        >
                          {f.description}
                        </p>
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
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5 }}
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
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.5 }}
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
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg, #004225, #2d6a4f, #c9a84c)', color: '#f4f1ea' }}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0,66,37,0.3)' }}
                  whileTap={{ scale: 0.95 }}
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
