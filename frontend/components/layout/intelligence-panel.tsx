'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Lightbulb, TrendingUp, CheckCircle2 } from 'lucide-react';
import { IntelligenceInsight } from '@/lib/types';

interface IntelligencePanelProps {
  insights?: IntelligenceInsight[];
  isVisible?: boolean;
}

const iconMap = {
  risk: AlertCircle,
  opportunity: TrendingUp,
  compliance: CheckCircle2,
  optimization: Lightbulb,
};

const categoryColors = {
  risk:         'bg-[#7c2d2d]/10 border-[#7c2d2d]/25 text-[#7c2d2d]',
  opportunity:  'bg-[#004225]/8 border-[#004225]/20 text-[#004225]',
  compliance:   'bg-[#c9a84c]/10 border-[#c9a84c]/30 text-[#8a6a1a]',
  optimization: 'bg-[#2d6a4f]/8 border-[#2d6a4f]/20 text-[#2d6a4f]',
};

export function IntelligencePanel({ insights = [], isVisible = true }: IntelligencePanelProps) {
  return (
    <motion.div
      className="hidden 2xl:flex flex-col w-80 bg-[#ede9df] border border-[rgba(0,66,37,0.15)] border-l border-[rgba(0,66,37,0.15)] overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-[rgba(0,66,37,0.15)]">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-[#004225]" />
          <h2 className="text-sm font-semibold text-[#1a1f2e]">Expert Analyst Insights</h2>
        </div>
        <p className="text-xs text-[#6b7280] mt-1">MSME loan risks & compliance alerts</p>
      </div>

      {/* Insights */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {insights.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-center">
            <p className="text-xs text-[#6b7280]">Upload an MSME loan agreement to see expert insights</p>
          </div>
        ) : (
          insights.map((insight, index) => {
            const Icon = iconMap[insight.category];
            const colorClass = categoryColors[insight.category];

            return (
              <motion.div
                key={index}
                className={`p-3 rounded-lg border ${colorClass} space-y-2`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start gap-2">
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold capitalize">{insight.category}</p>
                    <p className="text-xs font-medium mt-1 line-clamp-2">{insight.title}</p>
                  </div>
                  {insight.impact === 'high' && (
                    <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#7c2d2d] text-white shadow-sm">
                      High
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-80 line-clamp-2">{insight.description}</p>
                {insight.actionable && (
                  <motion.button
                    className="text-xs font-medium mt-2 px-2 py-1 rounded bg-current/20 hover:bg-current/30 transition-colors w-full text-left"
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    View Details →
                  </motion.button>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
