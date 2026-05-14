'use client';

import { motion } from 'framer-motion';

interface RiskScoreCardProps {
  label: string;
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  isLarge?: boolean;
}

/* Private Vault semantic colours — no Tailwind colour classes */
const levelColors = {
  critical: {
    bg:       'rgba(124,45,45,0.08)',
    border:   'rgba(124,45,45,0.25)',
    hex:      '#7c2d2d',
    gradient: 'linear-gradient(135deg, rgba(124,45,45,0.12), rgba(155,58,42,0.06))',
  },
  high: {
    bg:       'rgba(155,58,42,0.08)',
    border:   'rgba(155,58,42,0.25)',
    hex:      '#9b3a2a',
    gradient: 'linear-gradient(135deg, rgba(155,58,42,0.12), rgba(138,92,0,0.06))',
  },
  medium: {
    bg:       'rgba(138,92,0,0.07)',
    border:   'rgba(138,92,0,0.22)',
    hex:      '#8a5c00',
    gradient: 'linear-gradient(135deg, rgba(138,92,0,0.10), rgba(201,168,76,0.06))',
  },
  low: {
    bg:       'rgba(26,92,56,0.07)',
    border:   'rgba(26,92,56,0.22)',
    hex:      '#1a5c38',
    gradient: 'linear-gradient(135deg, rgba(26,92,56,0.10), rgba(0,66,37,0.06))',
  },
};

export function RiskScoreCard({ label, score, level, isLarge = false }: RiskScoreCardProps) {
  const c = levelColors[level];
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      className="relative rounded-lg p-5 overflow-hidden group transition-all duration-200"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: isLarge ? 1.02 : 1.04, y: -3, boxShadow: `0 8px 24px ${c.hex}20` }}
      transition={{ duration: 0.25 }}
    >
      {/* Hover gradient overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: c.gradient }}
      />

      <div className={`relative ${isLarge ? 'space-y-5' : 'space-y-3'}`}>
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: '#6b7280', fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          {label}
        </p>

        <div className="flex items-center justify-between">
          <motion.div
            className={`font-black ${isLarge ? 'text-5xl' : 'text-4xl'}`}
            style={{ color: c.hex, fontFamily: "'DM Serif Display', Georgia, serif" }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring' }}
          >
            {score}
          </motion.div>

          {isLarge && (
            <motion.div
              className="relative w-28 h-28"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <svg className="w-28 h-28 transform -rotate-90">
                <defs>
                  <filter id="scoreGlow">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <circle cx="56" cy="56" r={radius} fill="none"
                  stroke={`${c.hex}25`} strokeWidth="5" />
                <motion.circle cx="56" cy="56" r={radius} fill="none"
                  stroke={c.hex} strokeWidth="5"
                  strokeDasharray={circumference} strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                  filter="url(#scoreGlow)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color: '#6b7280' }}>%</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <motion.span
            className="w-2 h-2 rounded-full"
            style={{ background: c.hex }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <p className="text-xs font-semibold capitalize" style={{ color: c.hex }}>
            {level} Risk
          </p>
        </div>
      </div>
    </motion.div>
  );
}
