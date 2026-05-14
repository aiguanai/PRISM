'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UploadArea } from '@/components/upload/upload-area';
import { ProcessingTimeline } from '@/components/processing/processing-timeline';
import { ResultsDashboard } from '@/components/results/results-dashboard';
import { mockAnalysisResult, mockIntelligenceInsights } from '@/lib/mock-data';

type ViewState = 'upload' | 'processing' | 'results';

export default function NewAnalysisPage() {
  const [currentView, setCurrentView] = useState<ViewState>('upload');
  const [processingPhase, setProcessingPhase] = useState<
    'scanning' | 'extracting' | 'analyzing' | 'intelligence' | 'complete'
  >('scanning');
  const [progress, setProgress] = useState(0);

  const handleFileSelect = () => {
    setCurrentView('processing');
    setProcessingPhase('scanning');
    setProgress(0);

    const phases: Array<{
      phase: 'scanning' | 'extracting' | 'analyzing' | 'intelligence' | 'complete';
      targetProgress: number;
      duration: number;
    }> = [
      { phase: 'scanning', targetProgress: 15, duration: 1000 },
      { phase: 'extracting', targetProgress: 35, duration: 2000 },
      { phase: 'analyzing', targetProgress: 65, duration: 3000 },
      { phase: 'intelligence', targetProgress: 85, duration: 2000 },
      { phase: 'complete', targetProgress: 100, duration: 1000 },
    ];

    let phaseIndex = 0;

    const simulatePhase = () => {
      if (phaseIndex >= phases.length) {
        setCurrentView('results');
        return;
      }

      const currentPhase = phases[phaseIndex];
      const startTime = Date.now();

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(
          (elapsed / currentPhase.duration) *
            (currentPhase.targetProgress -
              (phaseIndex > 0 ? phases[phaseIndex - 1].targetProgress : 0)) +
            (phaseIndex > 0 ? phases[phaseIndex - 1].targetProgress : 0),
          currentPhase.targetProgress
        );

        setProgress(p);
        setProcessingPhase(currentPhase.phase);

        if (elapsed < currentPhase.duration) {
          requestAnimationFrame(updateProgress);
        } else {
          phaseIndex++;
          setTimeout(simulatePhase, 500);
        }
      };

      updateProgress();
    };

    simulatePhase();
  };

  return (
    <DashboardLayout insights={mockIntelligenceInsights}>
      <main className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen">
        {/* Background orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl"
            animate={{ x: [0, 50, -30, 0], y: [0, -40, 30, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-72 h-72 bg-gradient-to-l from-secondary/20 to-primary/20 rounded-full blur-3xl"
            animate={{ x: [0, -50, 30, 0], y: [0, 40, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <AnimatePresence mode="wait">
          {currentView === 'upload' && (
            <motion.div
              key="upload"
              className="relative z-10 space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-2">
                <h2 className="font-display text-3xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                  New Analysis
                </h2>
                <p className="text-muted-foreground">
                  Upload a document to begin AI-powered analysis.
                </p>
              </div>
              <UploadArea onFileSelect={handleFileSelect} onAnalyze={handleFileSelect} />
            </motion.div>
          )}

          {currentView === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <ProcessingTimeline
                currentPhase={processingPhase}
                progress={Math.round(progress)}
                message={
                  processingPhase === 'scanning'
                    ? 'Scanning document structure and content'
                    : processingPhase === 'extracting'
                    ? 'Extracting clauses and key terms'
                    : processingPhase === 'analyzing'
                    ? 'Analyzing legal and financial implications'
                    : processingPhase === 'intelligence'
                    ? 'Generating AI insights and recommendations'
                    : 'Analysis complete'
                }
                estimatedTimeRemaining={Math.max(0, 15 - Math.round(progress / 5))}
              />
            </motion.div>
          )}

          {currentView === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <ResultsDashboard analysis={mockAnalysisResult} />
              <motion.div
                className="mt-8 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  onClick={() => setCurrentView('upload')}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
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
