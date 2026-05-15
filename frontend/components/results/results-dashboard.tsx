'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, ShieldAlert, FileWarning,
  Download, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { DocumentAnalysis, Clause } from '@/lib/types';
import { RiskScoreCard } from './risk-score-card';
import { ClauseCard } from './clause-card';

interface ResultsDashboardProps {
  analysis:   DocumentAnalysis;
  documentId?: string;
}

const severityColors = {
  critical: { text: 'text-[#7c2d2d]', bg: 'bg-[#7c2d2d]/8', border: 'border-[#7c2d2d]/25' },
  high: { text: 'text-[#9b3a2a]', bg: 'bg-[#9b3a2a]/8', border: 'border-[#9b3a2a]/25' },
  medium: { text: 'text-[#8a5c00]', bg: 'bg-[#8a5c00]/6', border: 'border-[#8a5c00]/22' },
};

export function ResultsDashboard({ analysis, documentId }: ResultsDashboardProps) {
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab]             = useState<'clauses' | 'rbi'>('clauses');
  const [downloading, setDownloading]         = useState(false);

  const handleExport = async () => {
    if (!documentId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/report`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `PRISM_Report_${documentId.slice(0, 8)}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Could not download report. Make sure the backend is running.'); }
    finally { setDownloading(false); }
  };

  const toggleClause = (id: string) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const criticalClauses = analysis.clauses.filter((c) => c.riskLevel === 'critical');
  const highClauses = analysis.clauses.filter((c) => c.riskLevel === 'high');
  const mediumClauses = analysis.clauses.filter((c) => c.riskLevel === 'medium');
  const lowClauses = analysis.clauses.filter((c) => c.riskLevel === 'low');

  const tabs = [
    { id: 'clauses', label: 'Clause Analysis', count: analysis.clauses.length },
    { id: 'rbi',     label: 'RBI Violations',  count: analysis.rbiViolations.length },
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex-1 space-y-6 min-w-0 w-full">

      {/* ── Document header ── */}
      <motion.div
        className="relative rounded-2xl overflow-hidden border border-[rgba(201,168,76,0.15)]"
        style={{ background: '#ede9df' }}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Animated top bar */}
        <motion.div
          className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#004225] via-[#c9a84c] to-[#7c2d2d]"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Ambient glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(248,113,113,0.06), transparent 60%)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        <div className="relative p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <motion.span
                className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  analysis.overallRisk.level === 'critical' ? 'bg-[#7c2d2d]/10 text-[#7c2d2d] border border-[#7c2d2d]/25' :
                  analysis.overallRisk.level === 'high'     ? 'bg-[#9b3a2a]/10 text-[#9b3a2a] border border-[#9b3a2a]/25' :
                  analysis.overallRisk.level === 'medium'   ? 'bg-[#8a5c00]/10 text-[#8a5c00] border border-[#8a5c00]/25' :
                                                              'bg-[#1a5c38]/10 text-[#1a5c38] border border-[#1a5c38]/25'
                }`}
                animate={{ boxShadow: ['0 0 0px rgba(248,113,113,0)', '0 0 12px rgba(248,113,113,0.3)', '0 0 0px rgba(248,113,113,0)'] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                {analysis.overallRisk.category}
              </motion.span>
              <span className="text-xs text-[#6b7280]">
                {new Date(analysis.analyzedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <motion.h1
              className="font-display text-2xl text-[#1a1f2e]"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              {analysis.documentName}
            </motion.h1>
            <motion.p
              className="text-sm text-[#6b7280]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              Lender: <span className="text-[#1a1f2e] font-medium">{analysis.lenderName}</span>
              &nbsp;·&nbsp;{analysis.clauses.length} clauses analysed
            </motion.p>
          </div>
          <motion.button
            onClick={handleExport}
            disabled={downloading || !documentId}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[rgba(0,66,37,0.15)] bg-[rgba(0,66,37,0.06)] hover:bg-[rgba(0,66,37,0.08)] text-[#1a1f2e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={!downloading ? { scale: 1.05 } : undefined}
            whileTap={!downloading ? { scale: 0.97 } : undefined}
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Downloading…' : 'Export Report'}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Score cards ── */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {[
          { label: 'Risk Score',      score: analysis.overallRisk.score,               level: analysis.overallRisk.level as 'critical'|'high'|'medium'|'low', isLarge: true },
          { label: 'Predatory Index', score: analysis.predatoryScore,                  level: (analysis.predatoryScore >= 40 ? 'critical' : analysis.predatoryScore >= 20 ? 'high' : analysis.predatoryScore >= 8 ? 'medium' : 'low') as 'critical'|'high'|'medium'|'low', isLarge: false },
          { label: 'RBI Violations',  score: analysis.rbiViolations.length,            level: (analysis.rbiViolations.length >= 5 ? 'critical' : analysis.rbiViolations.length >= 2 ? 'high' : analysis.rbiViolations.length >= 1 ? 'medium' : 'low') as 'critical'|'high'|'medium'|'low', isLarge: false },
          { label: 'Clauses Flagged', score: criticalClauses.length + highClauses.length, level: (criticalClauses.length > 0 ? 'critical' : highClauses.length > 0 ? 'high' : 'low') as 'critical'|'high'|'medium'|'low', isLarge: false },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.07 }}
          >
            <RiskScoreCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Key findings ── */}
      <motion.div
        className="rounded-2xl border border-[rgba(201,168,76,0.15)] overflow-hidden"
        style={{ background: '#ede9df' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[rgba(201,168,76,0.12)]">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <AlertCircle className="w-4 h-4 text-[#7c2d2d]" />
          </motion.div>
          <h2 className="text-sm font-bold text-[#1a1f2e]">Key Findings</h2>
          <motion.span
            className="ml-auto text-xs font-bold text-[#7c2d2d] bg-[#7c2d2d]/8 px-2 py-0.5 rounded-full border border-[#7c2d2d]/25"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {analysis.keyFindings.length} issues
          </motion.span>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-3">
          {analysis.keyFindings.map((finding, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-[rgba(0,66,37,0.05)] transition-colors"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ x: 3 }}
            >
              <motion.span
                className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#7c2d2d]"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              />
              <p className="text-sm text-[#6b7280] leading-relaxed">{finding}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <div>
        <div className="flex gap-1 p-1 rounded-xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] w-fit mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                  ? 'text-[#1a1f2e]'
                  : 'text-[#6b7280] hover:text-[#1a1f2e]'
                }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'linear-gradient(135deg, rgba(0,66,37,0.12), rgba(201,168,76,0.08))' }}
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative">{tab.label}</span>
              {tab.count !== null && (
                <span className={`relative text-xs px-1.5 py-0.5 rounded-md font-bold ${activeTab === tab.id ? 'bg-[#7c2d2d]/12 text-[#7c2d2d]' : 'bg-[rgba(0,66,37,0.06)] text-[#6b7280]'
                  }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── CLAUSE ANALYSIS TAB ── */}
          {activeTab === 'clauses' && (
            <motion.div
              key="clauses"
              className="space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {[
                { list: criticalClauses, label: 'Critical', color: 'text-[#7c2d2d]', dot: 'bg-[#7c2d2d]' },
                { list: highClauses, label: 'High Risk', color: 'text-[#9b3a2a]', dot: 'bg-[#9b3a2a]' },
                { list: mediumClauses, label: 'Medium', color: 'text-[#8a5c00]', dot: 'bg-[#8a5c00]' },
                { list: lowClauses, label: 'Low Risk', color: 'text-[#1a5c38]', dot: 'bg-[#1a5c38]' },
              ].map(({ list, label, color, dot }) =>
                list.length > 0 ? (
                  <div key={label} className="space-y-3">
                    <div className={`flex items-center gap-2 text-sm font-bold ${color}`}>
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      {label} — {list.length} clause{list.length > 1 ? 's' : ''}
                    </div>
                    <div className="space-y-2">
                      {list.map((clause, i) => (
                        <ClauseCard
                          key={clause.id}
                          clause={clause}
                          isExpanded={expandedClauses.has(clause.id)}
                          onToggle={() => toggleClause(clause.id)}
                          delay={i * 0.04}
                        />
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </motion.div>
          )}

          {/* ── RBI VIOLATIONS TAB ── */}
          {activeTab === 'rbi' && (
            <motion.div
              key="rbi"
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="rounded-xl border border-[#7c2d2d]/20 bg-[#7c2d2d]/5 p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#7c2d2d] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#6b7280] leading-relaxed">
                  The following clauses have been identified as potential violations of RBI guidelines and Indian lending law.
                  These can be cited when negotiating with the lender or filing a complaint with the Banking Ombudsman.
                </p>
              </div>

              {analysis.rbiViolations.map((v, i) => {
                const c = severityColors[v.severity];
                const triggeredClause = analysis.clauses.find(cl => cl.id === v.clauseRef);
                return (
                  <motion.div
                    key={v.id}
                    className={`rounded-2xl border ${c.border} ${c.bg} p-5 space-y-3`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.6) }}
                  >
                    {/* Rule header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <FileWarning className={`w-4 h-4 flex-shrink-0 mt-0.5 ${c.text}`} />
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${c.text} mb-1`}>
                            {v.severity} violation · {v.regulation}
                          </p>
                          <p className="text-sm font-semibold text-[#1a1f2e]">{v.description}</p>
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-xs text-[#6b7280] bg-[rgba(0,66,37,0.06)] px-2 py-1 rounded-lg border border-[rgba(0,66,37,0.15)] whitespace-nowrap">
                        {v.clauseRef}
                      </span>
                    </div>

                    {/* The actual clause text that triggered this rule */}
                    {triggeredClause && (
                      <div className="pl-7">
                        <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-2">
                          Problematic Clause
                        </p>
                        <div className={`rounded-lg border-l-4 ${c.border} bg-[rgba(0,0,0,0.025)] p-3`}>
                          <p className="text-xs text-[#1a1f2e] leading-relaxed font-mono break-words">
                            &ldquo;{triggeredClause.content.length > 350
                              ? triggeredClause.content.slice(0, 350) + '…'
                              : triggeredClause.content}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              <div className="rounded-xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] p-4">
                <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-2">Legal References</p>
                <div className="space-y-1.5">
                  {analysis.legalReferences.map((ref, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#6b7280]">
                      <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#004225]" />
                      {ref}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}


        </AnimatePresence>
      </div>
      </div>
      
    </div>
  );
}
