'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, ShieldAlert, FileWarning,
  Download, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { DocumentAnalysis } from '@/lib/types';
import { useSettings } from '@/lib/settings';
import { RiskScoreCard } from './risk-score-card';
import { ClauseCard } from './clause-card';

interface ResultsDashboardProps {
  analysis:   DocumentAnalysis;
  documentId?: string;
}

type Sev = 'critical' | 'high' | 'medium' | 'low';

const sevText: Record<Sev, string> = {
  critical: 'text-sev-critical',
  high:     'text-sev-high',
  medium:   'text-sev-medium',
  low:      'text-sev-low',
};
const sevDot: Record<Sev, string> = {
  critical: 'bg-sev-critical',
  high:     'bg-sev-high',
  medium:   'bg-sev-medium',
  low:      'bg-sev-low',
};
const sevCard: Record<Exclude<Sev, 'low'>, string> = {
  critical: 'bg-sev-critical-bg border-sev-critical-border',
  high:     'bg-sev-high-bg border-sev-high-border',
  medium:   'bg-sev-medium-bg border-sev-medium-border',
};

export function ResultsDashboard({ analysis, documentId }: ResultsDashboardProps) {
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab]             = useState<'clauses' | 'rbi'>('clauses');
  const [downloading, setDownloading]         = useState(false);
  const [settings]                            = useSettings();

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
  const highClauses     = analysis.clauses.filter((c) => c.riskLevel === 'high');
  const mediumClauses   = analysis.clauses.filter((c) => c.riskLevel === 'medium');
  const lowClauses = settings.showSafeClauses
    ? analysis.clauses.filter((c) => c.riskLevel === 'low')
    : [];

  const overall = analysis.overallRisk.level as Sev;
  const predLevel: Sev = analysis.predatoryScore >= 40 ? 'critical' : analysis.predatoryScore >= 20 ? 'high' : analysis.predatoryScore >= 8 ? 'medium' : 'low';
  const rbiLevel: Sev = analysis.rbiViolations.length >= 5 ? 'critical' : analysis.rbiViolations.length >= 2 ? 'high' : analysis.rbiViolations.length >= 1 ? 'medium' : 'low';
  const flaggedLevel: Sev = criticalClauses.length > 0 ? 'critical' : highClauses.length > 0 ? 'high' : 'low';

  const tabs = [
    { id: 'clauses', label: 'Clause Analysis', count: analysis.clauses.length },
    { id: 'rbi',     label: 'RBI Violations',  count: analysis.rbiViolations.length },
  ] as const;

  return (
    <div className="space-y-6 w-full">

      {/* ── Document header ── */}
      <motion.div
        className="card-elevated relative overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${sevDot[overall]}`} />
        <div className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider border ${overall === 'low' ? 'bg-sev-low-bg border-sev-low-border text-sev-low' : sevCard[overall as Exclude<Sev,'low'>] + ' ' + sevText[overall]}`}>
                {analysis.overallRisk.category}
              </span>
              <span className="num text-xs text-muted-foreground">
                {new Date(analysis.analyzedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{analysis.documentName}</h1>
            <p className="text-sm text-muted-foreground">
              Lender: <span className="text-foreground font-medium">{analysis.lenderName}</span>
              &nbsp;·&nbsp;<span className="num">{analysis.clauses.length}</span> clauses analysed
            </p>
          </div>
          <motion.button
            onClick={handleExport}
            disabled={downloading || !documentId}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border border-border bg-card hover:border-accent/50 text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            whileHover={!downloading ? { scale: 1.03 } : undefined}
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
          { label: 'Risk Score',      score: analysis.overallRisk.score,                 level: overall,      isLarge: true },
          { label: 'Predatory Index', score: analysis.predatoryScore,                    level: predLevel,    isLarge: false },
          { label: 'RBI Violations',  score: analysis.rbiViolations.length,              level: rbiLevel,     isLarge: false },
          { label: 'Clauses Flagged', score: criticalClauses.length + highClauses.length, level: flaggedLevel, isLarge: false },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
          >
            <RiskScoreCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Key findings ── */}
      <motion.div
        className="card-elevated overflow-hidden"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <AlertCircle className="w-4 h-4 text-sev-critical" />
          <h2 className="text-sm font-semibold text-foreground">Key Findings</h2>
          <span className="num ml-auto text-xs font-semibold text-sev-critical bg-sev-critical-bg px-2 py-0.5 rounded-full border border-sev-critical-border">
            {analysis.keyFindings.length} issues
          </span>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-3">
          {analysis.keyFindings.map((finding, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.05, duration: 0.3 }}
            >
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sev-critical" />
              <p className="text-sm text-muted-foreground leading-relaxed">{finding}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <div>
        <div className="flex gap-1 p-1 rounded-full border border-border bg-card w-fit mb-6 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary"
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative">{tab.label}</span>
              <span className={`num relative text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.id ? 'bg-white/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {tab.count}
              </span>
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
              {([
                { list: criticalClauses, label: 'Critical', sevKey: 'critical' as Sev },
                { list: highClauses,     label: 'High Risk', sevKey: 'high' as Sev },
                { list: mediumClauses,   label: 'Medium',    sevKey: 'medium' as Sev },
                { list: lowClauses,      label: 'Low Risk',  sevKey: 'low' as Sev },
              ]).map(({ list, label, sevKey }) =>
                list.length > 0 ? (
                  <div key={label} className="space-y-3">
                    <div className={`flex items-center gap-2 text-sm font-semibold ${sevText[sevKey]}`}>
                      <span className={`w-2 h-2 rounded-full ${sevDot[sevKey]}`} />
                      {label} — <span className="num">{list.length}</span> clause{list.length > 1 ? 's' : ''}
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
              <div className="card-elevated p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-sev-critical flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The following clauses have been identified as potential violations of RBI guidelines and Indian lending law.
                  These can be cited when negotiating with the lender or filing a complaint with the Banking Ombudsman.
                </p>
              </div>

              {analysis.rbiViolations.map((v, i) => {
                const sk = v.severity as Sev;
                const triggeredClause = analysis.clauses.find(cl => cl.id === v.clauseRef);
                return (
                  <motion.div
                    key={v.id}
                    className="card-elevated p-5 space-y-3"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.6) }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <FileWarning className={`w-4 h-4 flex-shrink-0 mt-0.5 ${sevText[sk]}`} />
                        <div>
                          <p className={`text-[11px] font-semibold uppercase tracking-wider ${sevText[sk]} mb-1`}>
                            {v.severity} violation · {v.regulation}
                          </p>
                          <p className="text-sm font-semibold text-foreground">{v.description}</p>
                        </div>
                      </div>
                      <span className="num flex-shrink-0 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border whitespace-nowrap">
                        {v.clauseRef}
                      </span>
                    </div>

                    {triggeredClause && (
                      <div className="pl-7">
                        <p className="label-caps mb-2">Problematic Clause</p>
                        <div className={`rounded-md border-l-4 p-3 bg-muted/50 ${sevDot[sk].replace('bg-', 'border-')}`}>
                          <p className="num text-xs text-foreground leading-relaxed break-words">
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

              <div className="card-elevated p-4">
                <p className="label-caps mb-2">Legal References</p>
                <div className="space-y-1.5">
                  {analysis.legalReferences.map((ref, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 flex-shrink-0 text-primary" />
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
  );
}
