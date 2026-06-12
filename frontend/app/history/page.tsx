'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Clock, ChevronRight, Search,
  X, ShieldAlert, BarChart3, History as HistoryIcon, Trash2, Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getHistory, getHistoryDocument, deleteHistoryDocument } from '@/lib/api';
import { HistoryDocument } from '@/lib/types';
import { ResultsDashboard } from '@/components/results/results-dashboard';
import { CountUp } from '@/components/ui/count-up';

type Sev = 'critical' | 'high' | 'medium' | 'low';

const sevText: Record<Sev, string> = {
  critical: 'text-sev-critical', high: 'text-sev-high', medium: 'text-sev-medium', low: 'text-sev-low',
};
const sevDot: Record<Sev, string> = {
  critical: 'bg-sev-critical', high: 'bg-sev-high', medium: 'bg-sev-medium', low: 'bg-sev-low',
};
const sevBadge: Record<Sev, string> = {
  critical: 'text-sev-critical bg-sev-critical-bg border-sev-critical-border',
  high:     'text-sev-high bg-sev-high-bg border-sev-high-border',
  medium:   'text-sev-medium bg-sev-medium-bg border-sev-medium-border',
  low:      'text-sev-low bg-sev-low-bg border-sev-low-border',
};

const FALLBACK_HEX: Record<Sev, string> = { critical: '#7c2d2d', high: '#9b3a2a', medium: '#8a5c00', low: '#1a5c38' };

/** Resolve severity hexes from CSS vars so charts theme correctly in light + dark. */
function useSevHex(): Record<Sev, string> {
  const { resolvedTheme } = useTheme();
  const [hex, setHex] = useState<Record<Sev, string>>(FALLBACK_HEX);
  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    const read = (k: Sev) => s.getPropertyValue(`--sev-${k}`).trim() || FALLBACK_HEX[k];
    setHex({ critical: read('critical'), high: read('high'), medium: read('medium'), low: read('low') });
  }, [resolvedTheme]);
  return hex;
}

/* ── Analytics charts (aggregated across all stored analyses) ── */
function AnalyticsCharts({ documents }: { documents: HistoryDocument[] }) {
  const sevHex = useSevHex();
  if (documents.length === 0) return null;

  const agg = documents.reduce(
    (acc, d) => {
      acc.critical += d.clauseBreakdown.critical;
      acc.high     += d.clauseBreakdown.high;
      acc.medium   += d.clauseBreakdown.medium;
      acc.low      += d.clauseBreakdown.low;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
  const pieData = (Object.keys(agg) as Sev[])
    .filter(k => agg[k] > 0)
    .map(k => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: agg[k], color: sevHex[k] }));

  const barData = documents.slice(0, 10).map(d => ({
    name: d.name.length > 14 ? d.name.slice(0, 12) + '…' : d.name,
    score: d.riskScore,
    color: sevHex[d.riskLevel],
  }));

  const tooltipStyle = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 10, fontSize: 12, boxShadow: 'var(--shadow-md)', color: 'var(--foreground)',
  };

  return (
    <motion.div
      className="grid md:grid-cols-2 gap-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Clause severity pie */}
      <div className="card-elevated p-4">
        <p className="label-caps mb-2">Clause Severity Distribution</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} strokeWidth={0} animationDuration={900}>
                {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
          {pieData.map(p => (
            <span key={p.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              {p.name}: <span className="num font-semibold text-foreground">{p.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Risk score per document */}
      <div className="card-elevated p-4">
        <p className="label-caps mb-2">Risk Score — Recent Documents</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={tooltipStyle} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={14} animationDuration={900}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function ClauseBar({ breakdown }: { breakdown: NonNullable<HistoryDocument['clauseBreakdown']> }) {
  const total = breakdown.critical + breakdown.high + breakdown.medium + breakdown.low;
  const segments = [
    { key: 'critical', cls: 'bg-sev-critical', label: 'Critical' },
    { key: 'high',     cls: 'bg-sev-high',     label: 'High'     },
    { key: 'medium',   cls: 'bg-sev-medium',   label: 'Medium'   },
    { key: 'low',      cls: 'bg-sev-low',      label: 'Low'      },
  ] as const;
  if (total === 0) return <p className="text-xs text-muted-foreground">No clauses recorded.</p>;
  return (
    <div className="space-y-3">
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {segments.map(({ key, cls }, si) => {
          const pct = (breakdown[key] / total) * 100;
          return pct > 0 ? (
            <motion.div
              key={key}
              className={`h-full first:rounded-l-full last:rounded-r-full ${cls}`}
              style={{ width: `${pct}%` }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: si * 0.08, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null;
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {segments.map(({ key, cls, label }) =>
          breakdown[key] > 0 ? (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />
              <span className="text-xs text-muted-foreground">{label}:</span>
              <span className="num text-xs font-semibold text-foreground">{breakdown[key]}</span>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function DetailPanel({ doc, loadingDetail, onClose }: { doc: HistoryDocument; loadingDetail: boolean; onClose: () => void }) {
  const totalClauses = doc.totalClauses ?? Object.values(doc.clauseBreakdown).reduce((a, b) => a + b, 0);
  const lvl = doc.riskLevel as Sev;

  const chips = [
    { label: 'Risk Score',       value: doc.riskScore,                  sub: `${doc.riskLevel} risk`,        color: sevText[lvl] },
    { label: 'RBI Violations',   value: doc.rbiViolations,              sub: 'rule matches',                 color: doc.rbiViolations > 0 ? 'text-sev-critical' : 'text-sev-low' },
    { label: 'Total Clauses',    value: totalClauses,                   sub: 'analysed',                     color: 'text-foreground' },
    { label: 'Critical Clauses', value: doc.clauseBreakdown.critical,   sub: 'immediate attention',         color: doc.clauseBreakdown.critical > 0 ? 'text-sev-critical' : 'text-sev-low' },
  ];

  return (
    <motion.div className="fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="relative ml-auto w-full max-w-3xl h-full overflow-y-auto border-l border-border bg-background"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
          <div className={`absolute top-0 inset-x-0 h-[2px] ${sevDot[lvl]}`} />
          <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0 flex items-center gap-3">
              <div className={`flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center border ${sevBadge[lvl]}`}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="label-caps">Document Analysis</p>
                <h2 className="text-sm font-semibold text-foreground truncate">{doc.name}</h2>
              </div>
            </div>
            <motion.button onClick={onClose} className="flex-shrink-0 ml-4 p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Stat chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {chips.map((chip, i) => (
              <motion.div
                key={chip.label}
                className="card-elevated p-4"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
              >
                <p className="label-caps mb-1">{chip.label}</p>
                <p className={`text-2xl font-bold ${chip.color}`}><CountUp value={chip.value} delay={0.1 + i * 0.05} /></p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{chip.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Clause breakdown */}
          <motion.div className="card-elevated overflow-hidden" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Clause Breakdown</h3>
              <span className="num ml-auto text-xs text-muted-foreground">{totalClauses} clauses</span>
            </div>
            <div className="p-5"><ClauseBar breakdown={doc.clauseBreakdown} /></div>
          </motion.div>

          {/* Full analysis */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {loadingDetail || !doc.analysis ? (
              <div className="card-elevated p-10 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading full clause analysis…</p>
              </div>
            ) : (
              <ResultsDashboard analysis={doc.analysis} documentId={doc.id} />
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<HistoryDocument | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<HistoryDocument[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [reloadKey, setReloadKey]         = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getHistory({ search })
        .then(({ documents: docs, total: t }) => { setDocuments(docs); setTotal(t); })
        .catch((err) => setError(err?.message ?? 'Failed to load history'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, reloadKey]);

  const handleSelectDoc = async (doc: HistoryDocument) => {
    setSelected(doc);
    setLoadingDetail(true);
    try {
      const full = await getHistoryDocument(doc.id);
      setSelected(full);
    } catch {
      /* keep summary if full fetch fails */
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (doc: HistoryDocument) => {
    if (!window.confirm(`Delete the analysis for "${doc.name}"? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    try {
      await deleteHistoryDocument(doc.id);
      setDocuments(docs => docs.filter(d => d.id !== doc.id));
      setTotal(t => Math.max(0, t - 1));
      if (selected?.id === doc.id) setSelected(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const criticalCount   = documents.filter((d) => d.riskLevel === 'critical').length;
  const highCount       = documents.filter((d) => d.riskLevel === 'high').length;
  const totalViolations = documents.reduce((s, d) => s + d.rbiViolations, 0);

  const summaryCards: { label: string; value: number; color: string }[] = [
    { label: 'Total Analyzed', value: total,           color: 'text-primary' },
    { label: 'Critical Risk',  value: criticalCount,   color: 'text-sev-critical' },
    { label: 'High Risk',      value: highCount,       color: 'text-sev-high' },
    { label: 'RBI Violations', value: totalViolations, color: 'text-sev-critical' },
  ];

  return (
    <DashboardLayout>
      <main className="relative p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto min-h-screen">
        <div className="space-y-7">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md flex items-center justify-center border border-primary/20 bg-primary/8">
                <HistoryIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">History</h1>
                <p className="text-muted-foreground text-sm">Every analysed document is stored — click one to reopen its full results.</p>
              </div>
            </div>
          </motion.div>

          {/* Summary stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summaryCards.map((s, i) => (
              <motion.div
                key={s.label}
                className="card-elevated p-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3 }}
              >
                <p className="label-caps mb-1">{s.label}</p>
                <p className={`text-3xl font-bold ${s.color}`}><CountUp value={s.value} delay={0.15 + i * 0.08} /></p>
              </motion.div>
            ))}
          </div>

          {/* Analytics charts */}
          {!loading && !error && <AnalyticsCharts documents={documents} />}

          {/* Search */}
          <motion.div className="relative" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by document name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent/40 transition-all text-sm shadow-sm"
            />
          </motion.div>

          {/* Document list */}
          <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card-elevated p-4 h-20">
                  <div className="flex items-center gap-4 h-full animate-pulse">
                    <div className="w-11 h-11 rounded-md bg-muted flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded-full w-2/3" />
                      <div className="h-2 bg-muted rounded-full w-1/2" />
                    </div>
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="card-elevated border-sev-critical-border bg-sev-critical-bg p-8 text-center">
                <p className="text-sm text-sev-critical font-semibold mb-1">Failed to load history</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <button className="mt-4 text-xs text-primary hover:underline" onClick={() => setReloadKey(k => k + 1)}>
                  Retry
                </button>
              </div>
            ) : documents.length === 0 ? (
              <div className="card-elevated p-12 text-center space-y-1">
                <ShieldAlert className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-foreground text-sm font-semibold">
                  {search ? 'No documents match your search.' : 'No analyses yet.'}
                </p>
                {!search && (
                  <p className="text-muted-foreground text-xs">Upload a loan agreement from the home page — completed analyses appear here automatically.</p>
                )}
              </div>
            ) : (
              documents.map((doc, i) => {
                const lvl = doc.riskLevel as Sev;
                const isHovered = hoveredId === doc.id;
                return (
                  <motion.div
                    key={doc.id}
                    className="card-elevated relative p-4 flex items-center gap-4 cursor-pointer group overflow-hidden"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ x: 4 }}
                    onClick={() => handleSelectDoc(doc)}
                    onHoverStart={() => setHoveredId(doc.id)}
                    onHoverEnd={() => setHoveredId(null)}
                  >
                    {/* Left accent bar */}
                    <motion.div
                      className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${sevDot[lvl]}`}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.25 }}
                    />

                    <div className={`relative flex-shrink-0 w-11 h-11 rounded-md flex items-center justify-center border ${sevBadge[lvl]}`}>
                      <FileText className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{doc.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                        <span><span className="num">{doc.totalClauses ?? 0}</span> clauses</span>
                        <span className="opacity-40">·</span>
                        <span><span className="num">{doc.rbiViolations}</span> RBI rule match{doc.rbiViolations !== 1 ? 'es' : ''}</span>
                        <span className="opacity-40">·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="num">{doc.analyzedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:flex flex-col items-center flex-shrink-0 w-16">
                      <span className="label-caps !text-[9px] mb-0.5">Risk</span>
                      <span className={`text-xl font-bold ${sevText[lvl]}`}>{doc.riskScore}</span>
                    </div>

                    <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold capitalize ${sevBadge[lvl]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sevDot[lvl]}`} />
                      {doc.riskLevel}
                    </div>

                    <motion.button
                      className="flex-shrink-0 p-2 rounded-md text-muted-foreground hover:text-sev-critical hover:bg-sev-critical-bg border border-transparent hover:border-sev-critical-border transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete analysis"
                    >
                      {deletingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </motion.button>

                    <ChevronRight className="flex-shrink-0 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {selected && (
          <DetailPanel doc={selected} loadingDetail={loadingDetail} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
