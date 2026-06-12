'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { Clause } from '@/lib/types';
import { CountUp } from '@/components/ui/count-up';

interface ClauseCardProps {
  clause: Clause;
  isExpanded: boolean;
  onToggle: () => void;
  delay?: number;
}

const sev = {
  critical: { text: 'text-sev-critical', dot: 'bg-sev-critical', ring: 'ring-sev-critical-border' },
  high:     { text: 'text-sev-high',     dot: 'bg-sev-high',     ring: 'ring-sev-high-border' },
  medium:   { text: 'text-sev-medium',   dot: 'bg-sev-medium',   ring: 'ring-sev-medium-border' },
  low:      { text: 'text-sev-low',      dot: 'bg-sev-low',      ring: 'ring-sev-low-border' },
};

export function ClauseCard({ clause, isExpanded, onToggle, delay = 0 }: ClauseCardProps) {
  const c = sev[clause.riskLevel];

  return (
    <motion.div
      className={`card-elevated overflow-hidden ${isExpanded ? `ring-1 ${c.ring}` : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1.5 ${c.dot}`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold text-foreground text-sm truncate">{clause.title}</h3>
              {clause.lineNumber && (
                <span className="num text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                  L{clause.lineNumber}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{clause.summary}</p>
          </div>

          <div className="flex-shrink-0 text-right">
            <div className={`text-2xl font-bold ${c.text}`}>
              <CountUp value={clause.riskScore} delay={delay + 0.1} />
            </div>
            <p className="label-caps !text-[9px]">Risk</p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="ml-3 flex-shrink-0"
        >
          <ChevronDown className={`w-5 h-5 ${c.text}`} />
        </motion.div>
      </button>

      {/* Expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="border-t border-border px-5 py-4 space-y-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div>
              <p className="label-caps mb-2">Clause content</p>
              <div className="rounded-md p-3.5 bg-muted/50 border border-border">
                <p className="text-sm text-foreground leading-relaxed">{clause.content}</p>
              </div>
            </div>

            {clause.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className={`w-4 h-4 ${c.text}`} />
                  <p className="label-caps">Recommendations</p>
                </div>
                <ul className="space-y-1.5 ml-6">
                  {clause.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="text-sm text-foreground list-disc marker:text-muted-foreground leading-relaxed"
                    >
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
