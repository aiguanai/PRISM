'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Search, AlertTriangle, Info } from 'lucide-react';

interface LiveDocumentScannerProps {
  progress: number;
  phase: string;
}

export function LiveDocumentScanner({ progress, phase }: LiveDocumentScannerProps) {
  // Deterministic document structure
  const paragraphs = useMemo(() => [
    { id: 0, lines: [85, 90, 80, 45], isClause: false },
    { id: 1, lines: [95, 88, 92, 60], isClause: true, type: 'danger', label: 'Penal Interest' },
    { id: 2, lines: [100, 90, 85, 80, 40], isClause: false },
    { id: 3, lines: [88, 92, 95, 80], isClause: true, type: 'warning', label: 'Lien Clause' },
    { id: 4, lines: [90, 85, 50], isClause: false },
    { id: 5, lines: [98, 92, 88, 95], isClause: true, type: 'warning', label: 'Prepayment Penalty' },
    { id: 6, lines: [85, 90, 80, 45], isClause: false },
  ], []);

  // Map progress (0-100) to scanner top position (0-100%)
  // Ensure scanner doesn't go completely off-screen until 100%
  const scannerPos = `${Math.min(progress, 100)}%`;

  return (
    <div className="relative w-full mx-auto rounded-3xl border overflow-hidden"
         style={{ 
           background: 'rgba(255, 255, 255, 0.4)', 
           borderColor: 'rgba(201,168,76,0.3)', 
           boxShadow: '0 20px 40px rgba(0,66,37,0.08)' 
         }}>
      {/* Header */}
      <div className="px-5 py-3 border-b flex items-center justify-between" 
           style={{ background: 'rgba(250, 249, 246, 0.9)', borderColor: 'rgba(201,168,76,0.15)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#004225]/10 flex items-center justify-center">
            <Search className="w-3.5 h-3.5 text-[#004225]" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#1a1f2e]">Document X-Ray</div>
            <div className="text-[10px] text-muted-foreground font-medium">Live Clause Extraction</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Active</span>
        </div>
      </div>

      {/* Document Body */}
      <div className="relative p-6 sm:p-8 h-[480px] overflow-hidden bg-[#fdfdfc] font-mono">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <Search className="w-64 h-64" />
        </div>

        <div className="space-y-5 relative z-10">
          {paragraphs.map((p, pIndex) => {
            // Determine if the scanner has passed this block
            const blockTop = (pIndex / paragraphs.length) * 100;
            const isScanned = progress > blockTop + 5; // offset slightly for visual sync
            const isActiveClause = isScanned && p.isClause;

            return (
              <div 
                key={p.id} 
                className={`relative p-3.5 rounded-xl transition-all duration-700 ${
                  isActiveClause 
                    ? (p.type === 'danger' ? 'bg-[#9b3a2a]/10 border-[#9b3a2a]/20' : 'bg-[#c9a84c]/10 border-[#c9a84c]/20') 
                    : 'bg-transparent border-transparent'
                } border`}
              >
                {isActiveClause && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className="absolute -left-2 -top-2 flex items-center gap-1.5"
                  >
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full shadow-sm ${
                      p.type === 'danger' ? 'bg-[#9b3a2a] text-white' : 'bg-[#c9a84c] text-white'
                    }`}>
                      {p.type === 'danger' ? <AlertTriangle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      p.type === 'danger' ? 'bg-[#9b3a2a]/10 text-[#9b3a2a]' : 'bg-[#c9a84c]/10 text-[#c9a84c]'
                    }`}>
                      {p.label}
                    </span>
                  </motion.div>
                )}
                
                {p.lines.map((width, lIndex) => (
                  <div 
                    key={lIndex}
                    className="h-2 rounded-full mb-3 last:mb-0 transition-colors duration-700"
                    style={{ 
                      width: `${width}%`,
                      backgroundColor: isActiveClause 
                        ? (p.type === 'danger' ? 'rgba(155,58,42,0.4)' : 'rgba(201,168,76,0.6)') 
                        : 'rgba(0,66,37,0.06)'
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Scanner Line */}
        <motion.div
          className="absolute left-0 right-0 pointer-events-none z-20"
          style={{
            height: '140px',
            top: scannerPos,
            translateY: '-100%', // Bottom of the gradient aligns with progress
            background: 'linear-gradient(to bottom, transparent 0%, rgba(201,168,76,0.05) 50%, rgba(201,168,76,0.4) 100%)',
            borderBottom: '2px solid #c9a84c',
          }}
          initial={{ top: '0%' }}
          animate={{ top: scannerPos }}
          transition={{ duration: 0.3, ease: 'linear' }}
        >
          {/* Glowing laser edge */}
          <div className="absolute bottom-[-2px] left-0 right-0 h-[3px] bg-[#c9a84c] blur-[3px]" />
          <div className="absolute bottom-[-1px] left-1/2 -translate-x-1/2 w-48 h-[2px] bg-white blur-[1px]" />
        </motion.div>
      </div>
    </div>
  );
}
