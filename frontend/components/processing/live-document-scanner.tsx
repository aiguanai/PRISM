'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Search, AlertTriangle, Info } from 'lucide-react';

interface LiveDocumentScannerProps {
  progress: number;
  phase: string;
}

export function LiveDocumentScanner({ progress }: LiveDocumentScannerProps) {
  const paragraphs = useMemo(() => [
    { id: 0, lines: [85, 90, 80, 45], isClause: false },
    { id: 1, lines: [95, 88, 92, 60], isClause: true, type: 'danger', label: 'Penal Interest' },
    { id: 2, lines: [100, 90, 85, 80, 40], isClause: false },
    { id: 3, lines: [88, 92, 95, 80], isClause: true, type: 'warning', label: 'Lien Clause' },
    { id: 4, lines: [90, 85, 50], isClause: false },
    { id: 5, lines: [98, 92, 88, 95], isClause: true, type: 'warning', label: 'Prepayment Penalty' },
    { id: 6, lines: [85, 90, 80, 45], isClause: false },
  ], []);

  const scannerPos = `${Math.min(progress, 100)}%`;

  return (
    <div className="card-elevated relative w-full mx-auto overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Search className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <div className="label-caps !text-[10px]">Document X-Ray</div>
            <div className="text-[10px] text-muted-foreground font-medium">Live Clause Extraction</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-sev-low-border bg-sev-low-bg">
          <span className="w-1.5 h-1.5 rounded-full bg-sev-low animate-pulse" />
          <span className="label-caps !text-[9px] !text-sev-low">Active</span>
        </div>
      </div>

      {/* Document body */}
      <div className="relative p-6 sm:p-8 h-[480px] overflow-hidden bg-card">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <Search className="w-64 h-64" />
        </div>

        <div className="space-y-5 relative z-10">
          {paragraphs.map((p, pIndex) => {
            const blockTop = (pIndex / paragraphs.length) * 100;
            const isScanned = progress > blockTop + 5;
            const isActiveClause = isScanned && p.isClause;
            const danger = p.type === 'danger';

            return (
              <div
                key={p.id}
                className={`relative p-3.5 rounded-lg border transition-all duration-700 ${
                  isActiveClause
                    ? (danger ? 'bg-sev-high-bg border-sev-high-border' : 'bg-sev-medium-bg border-sev-medium-border')
                    : 'bg-transparent border-transparent'
                }`}
              >
                {isActiveClause && (
                  <motion.div
                    initial={{ opacity: 0, x: -10, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className="absolute -left-2 -top-2 flex items-center gap-1.5"
                  >
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full shadow-sm text-white ${danger ? 'bg-sev-high' : 'bg-sev-medium'}`}>
                      {danger ? <AlertTriangle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                    </div>
                    <span className={`label-caps !text-[10px] px-2 py-0.5 rounded-full ${danger ? '!text-sev-high bg-sev-high-bg' : '!text-sev-medium bg-sev-medium-bg'}`}>
                      {p.label}
                    </span>
                  </motion.div>
                )}

                {p.lines.map((width, lIndex) => (
                  <div
                    key={lIndex}
                    className={`h-2 rounded-full mb-3 last:mb-0 transition-colors duration-700 ${
                      isActiveClause ? (danger ? 'bg-sev-high/40' : 'bg-sev-medium/50') : 'bg-muted'
                    }`}
                    style={{ width: `${width}%` }}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Scanner line */}
        <motion.div
          className="absolute left-0 right-0 pointer-events-none z-20"
          style={{
            height: '140px',
            translateY: '-100%',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(201,168,76,0.05) 50%, rgba(201,168,76,0.35) 100%)',
            borderBottom: '2px solid var(--accent)',
          }}
          initial={{ top: '0%' }}
          animate={{ top: scannerPos }}
          transition={{ duration: 0.3, ease: 'linear' }}
        >
          <div className="absolute bottom-[-2px] left-0 right-0 h-[3px] bg-accent blur-[3px]" />
          <div className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-48 h-[2px] bg-white blur-[1px]" />
        </motion.div>
      </div>
    </div>
  );
}
