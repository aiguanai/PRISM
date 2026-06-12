'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ScanLine, Scissors, Search, Sparkles } from 'lucide-react';

interface ProcessingTimelineProps {
  currentPhase: 'scanning' | 'extracting' | 'analyzing' | 'intelligence' | 'complete';
  progress: number;
  message?: string;
  estimatedTimeRemaining?: number;
}

// Per-phase accent sourced from design tokens (themes correctly in dark/light).
const phases = [
  { id: 'scanning',     label: 'Scanning Document',      desc: 'Reading structure and content',        icon: ScanLine,     color: 'var(--primary)' },
  { id: 'extracting',   label: 'Extracting Clauses',     desc: 'Identifying key terms and provisions', icon: Scissors,     color: 'var(--secondary)' },
  { id: 'analyzing',    label: 'Analysing Risk',         desc: 'Checking against RBI guidelines',      icon: Search,       color: 'var(--sev-high)' },
  { id: 'intelligence', label: 'Generating Intelligence', desc: 'Building recommendations',            icon: Sparkles,     color: 'var(--gold-text)' },
  { id: 'complete',     label: 'Complete',               desc: 'Analysis ready',                       icon: CheckCircle2, color: 'var(--sev-low)' },
];

export function ProcessingTimeline({
  currentPhase,
  progress,
  message = 'Processing your document…',
  estimatedTimeRemaining = 0,
}: ProcessingTimelineProps) {
  const currentIndex = phases.findIndex((p) => p.id === currentPhase);
  const isComplete = currentPhase === 'complete';
  const activeColor = phases[currentIndex]?.color ?? 'var(--primary)';

  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <div className="space-y-6">
      {/* ── Central progress ring ── */}
      <motion.div
        className="card-elevated relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: activeColor }} />

        <div className="relative p-8 flex flex-col items-center gap-6">
          <div className="relative">
            {/* One soft pulse ring while active */}
            {!isComplete && (
              <motion.div
                className="absolute inset-0 rounded-full border"
                style={{ borderColor: activeColor }}
                animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
              <circle cx="70" cy="70" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
              <motion.circle
                cx="70" cy="70" r={r}
                fill="none"
                stroke={activeColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="num text-4xl font-bold" style={{ color: activeColor }}>
                {Math.round(progress)}<span className="text-xl">%</span>
              </div>
              <p className="label-caps mt-0.5">{isComplete ? 'Done' : 'Processing'}</p>
            </div>
          </div>

          <div className="text-center space-y-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                className="text-sm font-semibold text-foreground"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                {message}
              </motion.p>
            </AnimatePresence>
            {estimatedTimeRemaining > 0 && (
              <p className="num text-xs text-muted-foreground">
                ~{Math.ceil(estimatedTimeRemaining)}s remaining
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Phase timeline ── */}
      <div className="space-y-2">
        {phases.map((phase, index) => {
          const isActive    = index === currentIndex;
          const isCompleted = index < currentIndex || isComplete;
          const isPending   = !isActive && !isCompleted;
          const Icon = phase.icon;

          return (
            <motion.div
              key={phase.id}
              className="relative flex items-center gap-4"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: isPending ? 0.45 : 1, x: 0 }}
              transition={{ delay: index * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Connector */}
              {index < phases.length - 1 && (
                <div
                  className="absolute left-5 top-10 bottom-0 w-px"
                  style={{ background: isCompleted ? phase.color : 'var(--border)' }}
                />
              )}

              {/* Icon bubble */}
              <div className="relative flex-shrink-0 z-10">
                {isCompleted ? (
                  <motion.div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--sev-low-bg)', border: '1px solid var(--sev-low-border)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-sev-low" />
                  </motion.div>
                ) : isActive ? (
                  <motion.div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--card)', border: `1.5px solid ${phase.color}` }}
                    animate={{ boxShadow: [`0 0 0 0 ${phase.color}`, `0 0 0 8px transparent`] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                      <Icon className="w-4 h-4" style={{ color: phase.color }} />
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted border border-border">
                    <Icon className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 flex items-center justify-between p-3.5 rounded-lg border transition-colors ${
                isActive ? 'border-border bg-muted/50' : isCompleted ? 'border-border bg-card' : 'border-transparent'
              }`}>
                <div>
                  <p className={`text-sm font-semibold ${isActive ? 'text-foreground' : isCompleted ? 'text-foreground/80' : 'text-muted-foreground/50'}`}>
                    {phase.label}
                  </p>
                  {isActive && <p className="text-xs text-muted-foreground mt-0.5">{phase.desc}</p>}
                  {isCompleted && <p className="text-xs text-muted-foreground/60 mt-0.5">Done</p>}
                </div>

                {isActive && (
                  <div className="w-20 h-1 rounded-full bg-muted overflow-hidden ml-4 flex-shrink-0">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: phase.color }}
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
