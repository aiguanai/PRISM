'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Zap, ScanLine, Scissors, Search, Sparkles } from 'lucide-react';

interface ProcessingTimelineProps {
  currentPhase: 'scanning' | 'extracting' | 'analyzing' | 'intelligence' | 'complete';
  progress: number;
  message?: string;
  estimatedTimeRemaining?: number;
}

const phases = [
  { id: 'scanning',     label: 'Scanning Document',       desc: 'Reading structure and content',         icon: ScanLine,     color: '#004225' },
  { id: 'extracting',   label: 'Extracting Clauses',       desc: 'Identifying key terms and provisions',  icon: Scissors,     color: '#2d6a4f' },
  { id: 'analyzing',    label: 'Analysing Risk',           desc: 'Checking against RBI guidelines',       icon: Search,       color: '#9b3a2a' },
  { id: 'intelligence', label: 'Generating Intelligence',  desc: 'Building recommendations',              icon: Sparkles,     color: '#c9a84c' },
  { id: 'complete',     label: 'Complete',                 desc: 'Analysis ready',                        icon: CheckCircle2, color: '#004225' },
];

export function ProcessingTimeline({
  currentPhase,
  progress,
  message = 'Processing your document...',
  estimatedTimeRemaining = 0,
}: ProcessingTimelineProps) {
  const currentIndex = phases.findIndex((p) => p.id === currentPhase);
  const isComplete = currentPhase === 'complete';
  const activeColor = phases[currentIndex]?.color ?? '#004225';

  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <div className="space-y-6">
      {/* ── Central progress ring ── */}
      <motion.div
        className="relative rounded-2xl border overflow-hidden"
        style={{ background: '#ede9df', borderColor: 'rgba(201,168,76,0.3)' }}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Animated top bar */}
        <motion.div
          className="absolute top-0 inset-x-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, #004225, ${activeColor}, #c9a84c)` }}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Ambient glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${activeColor}12, transparent 60%)` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        <div className="relative p-8 flex flex-col items-center gap-6">
          {/* SVG ring */}
          <div className="relative">
            {/* Outer pulse rings */}
            {!isComplete && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2"
                  style={{ borderColor: `${activeColor}30` }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border"
                  style={{ borderColor: `${activeColor}20` }}
                  animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                />
              </>
            )}

            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#004225" />
                  <stop offset="50%" stopColor={activeColor} />
                  <stop offset="100%" stopColor="#c9a84c" />
                </linearGradient>
                <filter id="ringGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Track */}
              <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              {/* Progress arc */}
              <motion.circle
                cx="70" cy="70" r={r}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                filter="url(#ringGlow)"
              />
            </svg>

            {/* Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                className="text-4xl font-black"
                style={{ color: activeColor }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {Math.round(progress)}
                <span className="text-xl">%</span>
              </motion.div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                {isComplete ? 'Done' : 'Processing'}
              </p>
            </div>
          </div>

          {/* Message */}
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
              <motion.p
                className="text-xs text-muted-foreground"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ~{Math.ceil(estimatedTimeRemaining)}s remaining
              </motion.p>
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
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Connector line */}
              {index < phases.length - 1 && (
                <div className="absolute left-5 top-10 bottom-0 w-px" style={{ background: isCompleted ? `linear-gradient(180deg, ${phase.color}, ${phases[index+1].color}40)` : 'rgba(255,255,255,0.06)' }} />
              )}

              {/* Icon bubble */}
              <div className="relative flex-shrink-0 z-10">
                {isCompleted ? (
                  <motion.div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: `${phase.color}20`, border: `1px solid ${phase.color}50` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}>
                      <CheckCircle2 className="w-5 h-5" style={{ color: phase.color }} />
                    </motion.div>
                  </motion.div>
                ) : isActive ? (
                  <motion.div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: `${phase.color}15`, border: `1.5px solid ${phase.color}` }}
                    animate={{ boxShadow: [`0 0 0 0 ${phase.color}40`, `0 0 0 10px ${phase.color}00`] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                      <Icon className="w-4 h-4" style={{ color: phase.color }} />
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(0,66,37,0.05)] border border-[rgba(201,168,76,0.15)]">
                    <Icon className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div
                className={`flex-1 flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isActive
                    ? 'border-[rgba(0,66,37,0.15)] bg-[rgba(0,66,37,0.05)]'
                    : isCompleted
                    ? 'border-[rgba(201,168,76,0.12)] bg-white/[0.015]'
                    : 'border-white/[0.03] bg-transparent'
                }`}
                style={isActive ? { boxShadow: `0 0 20px ${phase.color}10` } : {}}
              >
                <div>
                  <p className={`text-sm font-semibold ${isActive ? 'text-foreground' : isCompleted ? 'text-foreground/80' : 'text-muted-foreground/40'}`}>
                    {phase.label}
                  </p>
                  {isActive && (
                    <motion.p
                      className="text-xs text-muted-foreground mt-0.5"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      {phase.desc}
                    </motion.p>
                  )}
                  {isCompleted && (
                    <p className="text-xs text-muted-foreground/50 mt-0.5">Done</p>
                  )}
                </div>

                {/* Active progress bar */}
                {isActive && (
                  <div className="w-20 h-1 rounded-full bg-[rgba(0,66,37,0.06)] overflow-hidden ml-4 flex-shrink-0">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${phase.color}80, ${phase.color})` }}
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                )}

                {isCompleted && (
                  <motion.span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-4 flex-shrink-0"
                    style={{ color: phase.color, background: `${phase.color}15`, border: `1px solid ${phase.color}30` }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring' }}
                  >
                    ✓
                  </motion.span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
