'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertCircle, Lightbulb } from 'lucide-react';
import { Clause } from '@/lib/types';

interface ClauseCardProps {
  clause: Clause;
  isExpanded: boolean;
  onToggle: () => void;
  delay?: number;
}

const riskColors = {
  critical: {
    border: 'border-[#7c2d2d]/30',
    bg: 'bg-[#7c2d2d]/8',
    text: 'text-[#7c2d2d]',
    badge: 'bg-[#7c2d2d]',
    hover: 'hover:bg-[#7c2d2d]/12 hover:shadow-md hover:shadow-[#7c2d2d]/15',
  },
  high: {
    border: 'border-[#9b3a2a]/30',
    bg: 'bg-[#9b3a2a]/8',
    text: 'text-[#9b3a2a]',
    badge: 'bg-[#9b3a2a]',
    hover: 'hover:bg-[#9b3a2a]/12 hover:shadow-md hover:shadow-[#9b3a2a]/15',
  },
  medium: {
    border: 'border-[#8a5c00]/25',
    bg: 'bg-[#8a5c00]/6',
    text: 'text-[#8a5c00]',
    badge: 'bg-[#8a5c00]',
    hover: 'hover:bg-[#8a5c00]/10 hover:shadow-md hover:shadow-[#8a5c00]/10',
  },
  low: {
    border: 'border-[#1a5c38]/25',
    bg: 'bg-[#1a5c38]/6',
    text: 'text-[#1a5c38]',
    badge: 'bg-[#1a5c38]',
    hover: 'hover:bg-[#1a5c38]/10 hover:shadow-md hover:shadow-[#1a5c38]/10',
  },
};

export function ClauseCard({
  clause,
  isExpanded,
  onToggle,
  delay = 0,
}: ClauseCardProps) {
  const colors = riskColors[clause.riskLevel];

  return (
    <motion.div
      className={`bg-[#f4f1ea] rounded-lg border ${colors.border} ${colors.bg} ${colors.hover} transition-all duration-200 cursor-pointer overflow-hidden group relative ${
        isExpanded ? `ring-1 ring-[#004225]/30` : ''
      }`}
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      {/* Animated background gradient on hover */}
      <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {clause.riskLevel === 'critical' && <div className="absolute inset-0 bg-gradient-to-r from-[#7c2d2d]/8 to-[#9b3a2a]/5" />}
        {clause.riskLevel === 'high'     && <div className="absolute inset-0 bg-gradient-to-r from-[#9b3a2a]/8 to-[#8a5c00]/5" />}
        {clause.riskLevel === 'medium'   && <div className="absolute inset-0 bg-gradient-to-r from-[#8a5c00]/6 to-[#c9a84c]/4" />}
        {clause.riskLevel === 'low'      && <div className="absolute inset-0 bg-gradient-to-r from-[#1a5c38]/6 to-[#004225]/4" />}
      </motion.div>

      {/* Header */}
      <button
        onClick={onToggle}
        className="relative w-full px-6 py-5 flex items-center justify-between"
      >
        <div className="flex items-start gap-4 flex-1 text-left">
          {/* Risk Badge with pulse animation */}
          <motion.div
            className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${colors.badge}`}
            animate={{ scale: isExpanded ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5, repeat: isExpanded ? Infinity : 0 }}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <motion.h3
                className={`font-bold text-[#1a1f2e] transition-colors text-sm ${
                  clause.riskLevel === 'critical' ? 'group-hover:text-[#7c2d2d]' :
                  clause.riskLevel === 'high'     ? 'group-hover:text-[#9b3a2a]' :
                  clause.riskLevel === 'medium'   ? 'group-hover:text-[#8a5c00]' :
                                                    'group-hover:text-[#1a5c38]'
                }`}
                whileHover={{ letterSpacing: '0.5px' }}
              >
                {clause.title}
              </motion.h3>
              {clause.lineNumber && (
                <span className="text-xs text-[#6b7280] bg-[#f4f1ea] px-2 py-0.5 rounded">
                  Line {clause.lineNumber}
                </span>
              )}
            </div>
            <p className="text-sm text-[#6b7280] line-clamp-2 leading-relaxed">{clause.summary}</p>
          </div>

          {/* Risk Score Badge */}
          <motion.div
            className="flex-shrink-0 text-right"
            whileHover={{ scale: 1.1 }}
          >
            <div className={`text-2xl font-black ${colors.text}`}>{clause.riskScore}</div>
            <p className="text-xs text-[#6b7280] font-medium">Risk</p>
          </motion.div>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3, type: 'spring' }}
          className="ml-4 flex-shrink-0"
        >
          <ChevronDown className={`w-6 h-6 ${colors.text}`} />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className={`relative border-t ${colors.border} px-6 py-5 space-y-4`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {/* Full clause content */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-3">
                Clause Content
              </p>
              <div className="relative rounded-lg p-4 bg-gradient-to-r from-[#f4f1ea] to-background/40 border border-[rgba(0,66,37,0.12)] hover:border-[rgba(0,66,37,0.15)]/60 transition-all">
                <p className="text-sm text-[#1a1f2e] leading-relaxed">
                  {clause.content}
                </p>
              </div>
            </motion.div>

            {/* Recommendations */}
            {clause.recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <motion.div
                    animate={{ rotate: isExpanded ? [0, 10, -10, 0] : 0 }}
                    transition={{ duration: 0.8, repeat: isExpanded ? Infinity : 0 }}
                  >
                    <Lightbulb className={`w-4 h-4 ${colors.text}`} />
                  </motion.div>
                  <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest">
                    Recommendations
                  </p>
                </div>
                <ul className="space-y-2 ml-6">
                  {clause.recommendations.map((rec, index) => (
                    <motion.li
                      key={index}
                      className="text-sm text-[#1a1f2e] list-disc marker:text-[#6b7280]"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                    >
                      {rec}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Action buttons */}
            <motion.div
              className="flex items-center gap-2 pt-3 border-t border-current/20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.button
                className={`flex-1 px-4 py-2.5 rounded font-semibold text-sm transition-all ${colors.bg} ${colors.text} border ${colors.border}`}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                ⚠️ Flag for Negotiation
              </motion.button>
              <motion.button
                className={`px-4 py-2.5 rounded font-semibold text-sm transition-all ${colors.bg} ${colors.text} border ${colors.border}`}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                📝 Note
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
