'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, TrendingDown, ShieldAlert, FileWarning,
  IndianRupee, Percent, Download, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { DocumentAnalysis, Clause } from '@/lib/types';
import { RiskScoreCard } from './risk-score-card';
import { ClauseCard } from './clause-card';

interface ResultsDashboardProps {
  analysis: DocumentAnalysis;
}

function DocumentMiniMap({ clauses, totalPages = 15 }: { clauses: Clause[], totalPages?: number }) {
  const pageRisks = Array.from({ length: totalPages }).map((_, pageIndex) => {
    const clausesOnPage = clauses.filter((c, i) => (i * 3 + c.id.charCodeAt(0)) % totalPages === pageIndex);
    
    if (clausesOnPage.some(c => c.riskLevel === 'critical')) return 'critical';
    if (clausesOnPage.some(c => c.riskLevel === 'high')) return 'high';
    if (clausesOnPage.some(c => c.riskLevel === 'medium')) return 'medium';
    return 'low';
  });

  return (
    <div className="sticky top-6 flex flex-col w-[80px] sm:w-[140px]">
      <div className="mb-4 px-1 text-center sm:text-left">
        <h3 className="text-[11px] font-bold text-[#1a1f2e] uppercase tracking-widest mb-1">Document X-Ray</h3>
        <p className="text-[9px] text-[#6b7280] leading-snug hidden sm:block">Shows exactly which pages contain hidden risks.</p>
      </div>

      <div className="text-[9px] font-bold text-[#6b7280] uppercase tracking-widest text-center mb-1">Start of Doc</div>
      
      <div className="w-full h-[400px] sm:h-[500px] bg-[rgba(0,66,37,0.02)] border border-[rgba(0,66,37,0.1)] rounded-lg relative overflow-hidden flex flex-col my-1">
        {pageRisks.map((risk, i) => (
          <div key={i} className="flex-1 border-b border-[rgba(0,66,37,0.05)] relative group cursor-pointer hover:bg-[rgba(0,66,37,0.06)] transition-colors">
            <div className="absolute inset-y-0 left-0 w-1 bg-[rgba(0,66,37,0.1)] group-hover:bg-[#c9a84c] transition-colors" />
            
            {risk === 'critical' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-1.5 bg-[#7c2d2d] rounded-full shadow-[0_0_8px_rgba(124,45,45,0.4)]" />
            )}
            {risk === 'high' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-1.5 bg-[#9b3a2a] rounded-full" />
            )}
            {risk === 'medium' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-1.5 bg-[#8a5c00] rounded-full" />
            )}

            <div className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[#1a1f2e] text-[#f4f1ea] text-[11px] py-2 px-3 rounded shadow-lg pointer-events-none z-50">
              <span className="font-bold text-[#c9a84c]">Page {i + 1}</span>
              <br/>
              <span className="opacity-90">
                {risk === 'critical' ? '⚠️ Contains Critical Trap' : risk === 'high' ? '🚨 Contains High Risk' : risk === 'medium' ? '⚠️ Contains Warning' : 'No issues found'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[9px] font-bold text-[#6b7280] uppercase tracking-widest text-center mt-1">End of Doc</div>

      <div className="mt-4 flex flex-col gap-2.5 px-1 hidden sm:flex bg-[rgba(0,66,37,0.02)] border border-[rgba(0,66,37,0.08)] p-2.5 rounded-lg">
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#7c2d2d]" /><span className="text-[9px] font-bold text-[#1a1f2e] uppercase tracking-wider">Critical Trap</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#9b3a2a]" /><span className="text-[9px] font-bold text-[#1a1f2e] uppercase tracking-wider">High Risk</span></div>
        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#8a5c00]" /><span className="text-[9px] font-bold text-[#1a1f2e] uppercase tracking-wider">Medium Warning</span></div>
      </div>
    </div>
  );
}

const severityColors = {
  critical: { text: 'text-[#7c2d2d]', bg: 'bg-[#7c2d2d]/8', border: 'border-[#7c2d2d]/25' },
  high: { text: 'text-[#9b3a2a]', bg: 'bg-[#9b3a2a]/8', border: 'border-[#9b3a2a]/25' },
  medium: { text: 'text-[#8a5c00]', bg: 'bg-[#8a5c00]/6', border: 'border-[#8a5c00]/22' },
};

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

export function ResultsDashboard({ analysis }: ResultsDashboardProps) {
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'clauses' | 'rbi' | 'cost'>('clauses');

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

  const tc = analysis.trueCost;
  const overcharge = tc.totalRepayable - tc.loanAmount;
  const hiddenCosts = tc.processingFee + tc.insurancePremium + tc.otherCharges;

  const tabs = [
    { id: 'clauses', label: 'Clause Analysis', count: analysis.clauses.length },
    { id: 'rbi', label: 'RBI Violations', count: analysis.rbiViolations.length },
    { id: 'cost', label: 'True Cost', count: null },
  ] as const;

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start">
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
                className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#7c2d2d]/10 text-[#7c2d2d] border border-[#7c2d2d]/25 uppercase tracking-wider"
                animate={{ boxShadow: ['0 0 0px rgba(248,113,113,0)', '0 0 12px rgba(248,113,113,0.3)', '0 0 0px rgba(248,113,113,0)'] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                High Predatory Risk
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
              &nbsp;·&nbsp;Loan Amount: <span className="text-[#1a1f2e] font-medium">{fmt(tc.loanAmount)}</span>
              &nbsp;·&nbsp;Tenure: <span className="text-[#1a1f2e] font-medium">{tc.tenure} months</span>
            </motion.p>
          </div>
          <motion.button
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[rgba(0,66,37,0.15)] bg-[rgba(0,66,37,0.06)] hover:bg-[rgba(0,66,37,0.08)] text-[#1a1f2e] transition-colors"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05, borderColor: 'rgba(0,66,37,0.3)' }}
            whileTap={{ scale: 0.97 }}
          >
            <Download className="w-4 h-4" />
            Export Report
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
          { label: 'Risk Score', score: analysis.overallRisk.score, level: analysis.overallRisk.level, isLarge: true },
          { label: 'Predatory Index', score: analysis.predatoryScore, level: 'critical' as const, isLarge: false },
          { label: 'RBI Violations', score: analysis.rbiViolations.length, level: 'critical' as const, isLarge: false },
          { label: 'Clauses Flagged', score: criticalClauses.length + highClauses.length, level: 'high' as const, isLarge: false },
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
                return (
                  <motion.div
                    key={v.id}
                    className={`rounded-2xl border ${c.border} ${c.bg} p-5 space-y-3`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <FileWarning className={`w-4 h-4 flex-shrink-0 mt-0.5 ${c.text}`} />
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-wider ${c.text} mb-1`}>
                            {v.severity} violation
                          </p>
                          <p className="text-sm font-semibold text-[#1a1f2e]">{v.regulation}</p>
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-xs text-[#6b7280] bg-[rgba(0,66,37,0.06)] px-2 py-1 rounded-lg border border-[rgba(0,66,37,0.15)]">
                        {v.clauseRef}
                      </span>
                    </div>
                    <p className="text-sm text-[#6b7280] leading-relaxed pl-7">{v.description}</p>
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

          {/* ── TRUE COST TAB ── */}
          {activeTab === 'cost' && (
            <motion.div
              key="cost"
              className="space-y-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* Rate comparison */}
              <div className="grid sm:grid-cols-2 gap-4">
                <motion.div
                  className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 }}
                >
                  <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-2">Stated Interest Rate</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-[#1a5c38]">{tc.statedInterestRate}</span>
                    <span className="text-lg font-bold text-[#1a5c38] mb-1">% p.a.</span>
                  </div>
                  <p className="text-xs text-[#6b7280] mt-1">As advertised by the lender</p>
                </motion.div>

                <motion.div
                  className="rounded-2xl border border-[#7c2d2d]/25 bg-[#7c2d2d]/6 p-5 relative overflow-hidden"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#7c2d2d] to-[#9b3a2a]" />
                  <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-2">Effective Annual Rate</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-[#7c2d2d]">{tc.effectiveAnnualRate}</span>
                    <span className="text-lg font-bold text-[#7c2d2d] mb-1">% p.a.</span>
                  </div>
                  <p className="text-xs mt-1 font-medium text-[#7c2d2d]/70">
                    +{(tc.effectiveAnnualRate - tc.statedInterestRate).toFixed(1)}% above stated rate
                  </p>
                </motion.div>
              </div>

              {/* Cost breakdown */}
              <motion.div
                className="rounded-2xl border border-[rgba(201,168,76,0.15)] overflow-hidden"
                style={{ background: '#ede9df' }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="flex items-center gap-2 px-6 py-4 border-b border-[rgba(201,168,76,0.12)]">
                  <IndianRupee className="w-4 h-4 text-[#004225]" />
                  <h3 className="text-sm font-bold text-[#1a1f2e]">Full Cost Breakdown</h3>
                </div>
                <div className="p-6 space-y-3">
                  {[
                    { label: 'Loan Principal', value: tc.loanAmount, highlight: false, note: '' },
                    { label: 'Total Interest', value: tc.totalRepayable - tc.loanAmount - hiddenCosts, highlight: false, note: `at ${tc.statedInterestRate}% p.a.` },
                    { label: 'Processing Fee', value: tc.processingFee, highlight: true, note: 'deducted upfront' },
                    { label: 'Insurance Premium', value: tc.insurancePremium, highlight: true, note: 'lender-affiliated insurer' },
                    { label: 'Other Charges', value: tc.otherCharges, highlight: true, note: 'documentation, stamp duty, etc.' },
                  ].map((row, i) => (
                    <motion.div
                      key={row.label}
                      className={`flex items-center justify-between py-2.5 border-b border-[rgba(0,66,37,0.1)] last:border-0 ${row.highlight ? 'group' : ''}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                    >
                      <div className="flex items-center gap-2">
                        {row.highlight && <span className="w-1.5 h-1.5 rounded-full bg-[#9b3a2a] flex-shrink-0" />}
                        <span className={`text-sm ${row.highlight ? 'text-[#9b3a2a]' : 'text-[#6b7280]'}`}>
                          {row.label}
                        </span>
                        {row.note && (
                          <span className="text-xs text-[#6b7280]/50">({row.note})</span>
                        )}
                      </div>
                      <span className={`text-sm font-bold ${row.highlight ? 'text-[#9b3a2a]' : 'text-[#1a1f2e]'}`}>
                        {fmt(row.value)}
                      </span>
                    </motion.div>
                  ))}

                  {/* Total */}
                  <motion.div
                    className="flex items-center justify-between pt-3 mt-1 border-t border-[rgba(0,66,37,0.15)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="text-sm font-bold text-[#1a1f2e]">Total Repayable</span>
                    <span className="text-xl font-black text-[#7c2d2d]">{fmt(tc.totalRepayable)}</span>
                  </motion.div>

                  {/* Overcharge bar */}
                  <motion.div
                    className="mt-4 p-4 rounded-xl bg-[#7c2d2d]/6 border border-[#7c2d2d]/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase text-[#7c2d2d] tracking-wider">You pay above principal</span>
                      <span className="text-sm font-black text-[#7c2d2d]">{fmt(overcharge)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[rgba(0,66,37,0.06)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#7c2d2d] to-[#9b3a2a]"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((overcharge / tc.totalRepayable) * 100, 100)}%` }}
                        transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-xs text-[#6b7280] mt-2">
                      {((overcharge / tc.loanAmount) * 100).toFixed(1)}% of principal paid as cost of borrowing
                    </p>
                  </motion.div>
                </div>
              </motion.div>

              {/* Penal interest warning */}
              <motion.div
                className="rounded-2xl border border-[#9b3a2a]/20 bg-[#9b3a2a]/5 p-5 flex items-start gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <TrendingDown className="w-5 h-5 text-[#9b3a2a] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#1a1f2e] mb-1">Penal Interest Scenario</p>
                  <p className="text-sm text-[#6b7280] leading-relaxed">
                    If you miss a single EMI, penal interest of <span className="text-[#9b3a2a] font-semibold">36% p.a.</span> applies
                    to the full outstanding principal of <span className="text-[#9b3a2a] font-semibold">{fmt(tc.loanAmount)}</span>.
                    That adds approximately <span className="text-[#9b3a2a] font-semibold">{fmt(Math.round(tc.loanAmount * 0.36 / 12))}</span> per
                    month on top of your regular EMI — before the default is cured.
                  </p>
                </div>
              </motion.div>

              {/* Confidence */}
              {analysis.financialImpact && (
                <motion.div
                  className="rounded-xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] p-4 flex items-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <Percent className="w-4 h-4 text-[#004225] flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-[#6b7280] mb-1.5">Analysis Confidence</p>
                    <div className="h-1.5 rounded-full bg-[rgba(0,66,37,0.06)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#004225] to-violet-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis.financialImpact.confidence * 100}%` }}
                        transition={{ duration: 1, delay: 0.4 }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#004225] flex-shrink-0">
                    {Math.round(analysis.financialImpact.confidence * 100)}%
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      </div>
      
      {/* ── Document Mini-Map Sidebar ── */}
      <div className="hidden md:block shrink-0 pt-1">
        <DocumentMiniMap clauses={analysis.clauses} totalPages={18} />
      </div>
    </div>
  );
}
