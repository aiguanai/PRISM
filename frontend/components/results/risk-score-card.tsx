'use client';

import { motion } from 'framer-motion';
import { CountUp } from '@/components/ui/count-up';

interface RiskScoreCardProps {
  label: string;
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  isLarge?: boolean;
}

const sev = {
  critical: { text: 'text-sev-critical', bar: 'bg-sev-critical', cssVar: 'var(--sev-critical)' },
  high:     { text: 'text-sev-high',     bar: 'bg-sev-high',     cssVar: 'var(--sev-high)' },
  medium:   { text: 'text-sev-medium',   bar: 'bg-sev-medium',   cssVar: 'var(--sev-medium)' },
  low:      { text: 'text-sev-low',      bar: 'bg-sev-low',      cssVar: 'var(--sev-low)' },
};

export function RiskScoreCard({ label, score, level, isLarge = false }: RiskScoreCardProps) {
  const c = sev[level];
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      className="card-elevated relative p-5 overflow-hidden h-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
    >
      {/* Severity top rule */}
      <div className={`absolute top-0 left-5 right-5 h-[2px] rounded-full ${c.bar}`} />

      <div className={isLarge ? 'space-y-4' : 'space-y-3'}>
        <p className="label-caps">{label}</p>

        <div className="flex items-center justify-between gap-3">
          <div className={`font-bold leading-none ${c.text} ${isLarge ? 'text-6xl' : 'text-5xl'}`}>
            <CountUp value={score} delay={0.2} />
          </div>

          {isLarge && (
            <motion.div
              className="relative w-24 h-24 flex-shrink-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <svg className="w-24 h-24 -rotate-90">
                <circle
                  cx="48" cy="48" r={radius} fill="none"
                  stroke="var(--border)" strokeWidth="5"
                />
                <motion.circle
                  cx="48" cy="48" r={radius} fill="none"
                  stroke={c.cssVar} strokeWidth="5"
                  strokeDasharray={circumference} strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="num text-xs font-semibold text-muted-foreground">/100</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${c.bar}`} />
          <p className={`text-xs font-semibold capitalize ${c.text}`}>{level} risk</p>
        </div>
      </div>
    </motion.div>
  );
}
