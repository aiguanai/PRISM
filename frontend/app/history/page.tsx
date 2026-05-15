'use client';

import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  FileText, Clock, AlertTriangle, ChevronRight, Search,
  X, Building2, MapPin, TrendingUp, TrendingDown, ShieldAlert,
  IndianRupee, Percent, Calendar, Users, Briefcase, ArrowUpRight,
  CheckCircle2, XCircle, AlertCircle, FileWarning, ChevronDown,
  Zap, Activity, BarChart3, Shield,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getHistory, getHistoryDocument } from '@/lib/api';
import { HistoryDocument } from '@/lib/types';
import { ResultsDashboard } from '@/components/results/results-dashboard';

/* ── Animated counter ── */
function Counter({ to, duration = 1.2, suffix = '' }: { to: number; duration?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration]);
  return <>{val}{suffix}</>;
}

/* ── Floating particles background ── */
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? '#004225' : i % 3 === 1 ? '#c9a84c' : '#2d6a4f',
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

const riskBadge: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high:     'text-[#9b3a2a] bg-orange-500/10 border-orange-500/30',
  medium:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low:      'text-green-400 bg-green-500/10 border-green-500/30',
};

const riskDot: Record<string, string> = {
  critical: 'bg-[#7c2d2d]',
  high:     'bg-[#9b3a2a]',
  medium:   'bg-[#8a5c00]',
  low:      'bg-[#1a5c38]',
};

const riskGlow: Record<string, string> = {
  critical: 'rgba(248,113,113,0.25)',
  high:     'rgba(251,146,60,0.25)',
  medium:   'rgba(250,204,21,0.20)',
  low:      'rgba(74,222,128,0.20)',
};

function fmt(n: number) {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000)   return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `${(n / 1000).toFixed(0)}K`;
  return `${n}`;
}

/* ── Radial gauge for predatory score ── */
function PredatoryMeter({ score }: { score: number }) {
  const color =
    score >= 70 ? '#f87171' :
    score >= 50 ? '#fb923c' :
    score >= 30 ? '#facc15' : '#4ade80';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ * 0.75; // 270° arc
  const offset = dash - (score / 100) * dash;

  return (
    <div className="flex items-center gap-5">
      {/* SVG gauge */}
      <div className="relative flex-shrink-0 w-24 h-24">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-[135deg]">
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
          <motion.circle
            cx="48" cy="48" r={r} fill="none"
            stroke={color} strokeWidth="7"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            initial={{ strokeDashoffset: dash }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black" style={{ color }}>
            <Counter to={score} duration={1.4} />
          </span>
          <span className="text-[9px] text-[#6b7280] font-semibold tracking-wider uppercase">Index</span>
        </div>
      </div>
      {/* Label */}
      <div className="flex-1 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-[#1a1f2e]">Predatory Score</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-md border" style={{ color, borderColor: `${color}40`, background: `${color}15` }}>
            {score >= 70 ? 'High Risk' : score >= 50 ? 'Moderate' : score >= 30 ? 'Low' : 'Safe'}
          </span>
        </div>
        <div className="h-2 rounded-full bg-[rgba(0,66,37,0.06)] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}` }}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="text-xs text-[#6b7280]">
          {score >= 70 ? 'Multiple exploitative clauses detected' :
           score >= 50 ? 'Several concerning terms present' :
           score >= 30 ? 'Minor issues, mostly compliant' : 'Agreement appears fair'}
        </p>
      </div>
    </div>
  );
}

function StatChip({ label, value, sub, color, delay = 0 }: { label: string; value: string; sub?: string; color?: string; delay?: number }) {
  return (
    <motion.div
      className="relative rounded-xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] p-4 overflow-hidden group"
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.04, borderColor: 'rgba(0,66,37,0.25)' }}
    >
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(0,66,37,0.06), transparent 70%)' }}
      />
      <p className="text-[10px] text-[#6b7280] uppercase tracking-widest mb-1 font-semibold">{label}</p>
      <p className={`text-2xl font-black ${color ?? 'text-[#1a1f2e]'}`}>{value}</p>
      {sub && <p className="text-[10px] text-[#6b7280] mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function ClauseBar({ breakdown }: { breakdown: HistoryDocument['clauseBreakdown'] }) {
  const total = breakdown.critical + breakdown.high + breakdown.medium + breakdown.low;
  const segments = [
    { key: 'critical', color: '#f87171', label: 'Critical', glow: 'rgba(248,113,113,0.5)' },
    { key: 'high',     color: '#fb923c', label: 'High',     glow: 'rgba(251,146,60,0.5)'  },
    { key: 'medium',   color: '#facc15', label: 'Medium',   glow: 'rgba(250,204,21,0.5)'  },
    { key: 'low',      color: '#4ade80', label: 'Low',      glow: 'rgba(74,222,128,0.5)'  },
  ] as const;
  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {segments.map(({ key, color, glow }, si) => {
          const pct = (breakdown[key] / total) * 100;
          return pct > 0 ? (
            <motion.div
              key={key}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ background: color, width: `${pct}%`, boxShadow: `0 0 8px ${glow}` }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: si * 0.1, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null;
        })}
      </div>
      {/* Legend with individual bars */}
      <div className="grid grid-cols-2 gap-2">
        {segments.map(({ key, color, label }, si) =>
          breakdown[key] > 0 ? (
            <motion.div
              key={key}
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + si * 0.07 }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
              <span className="text-xs text-[#6b7280]">{label}:</span>
              <span className="text-xs font-bold text-[#1a1f2e]">{breakdown[key]}</span>
            </motion.div>
          ) : null
        )}
      </div>
    </div>
  );
}

﻿function DetailPanel({ doc, onClose }: { doc: HistoryDocument; onClose: () => void }) {
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const overcharge = doc.totalRepayable - doc.loanAmount;
  const d = doc.demographics;
  const riskColor = doc.riskLevel === 'critical' ? '#f87171' : doc.riskLevel === 'high' ? '#fb923c' : doc.riskLevel === 'medium' ? '#facc15' : '#4ade80';
  const sv = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.07, duration: 0.4, ease: [0.22,1,0.36,1] as any } }),
  };
  return (
    <motion.div className="fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-[rgba(0,20,10,0.5)] backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        className="relative ml-auto w-full max-w-3xl h-full overflow-y-auto border-l border-[rgba(201,168,76,0.18)]"
        style={{ background: '#ede9df', backdropFilter: 'blur(32px)' }}
        initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20" style={{ background: `radial-gradient(circle, ${riskColor}, transparent 70%)` }} />
        <Particles />
        {/* Sticky header */}
        <div className="sticky top-0 z-20 border-b border-[rgba(201,168,76,0.15)]" style={{ background: '#ede9df', backdropFilter: 'blur(24px)' }}>
          <motion.div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: `linear-gradient(90deg, #004225, ${riskColor}, #c9a84c)` }} initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6 }} />
          <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0 flex items-center gap-3">
              <motion.div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border border-[rgba(0,66,37,0.15)]" style={{ background: `${riskColor}15` }} animate={{ boxShadow: [`0 0 0px ${riskColor}`, `0 0 16px ${riskColor}60`, `0 0 0px ${riskColor}`] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <FileText className="w-4 h-4" style={{ color: riskColor }} />
              </motion.div>
              <div className="min-w-0">
                <p className="text-[10px] text-[#6b7280] uppercase tracking-widest">Document Analysis</p>
                <h2 className="text-sm font-bold text-[#1a1f2e] truncate">{doc.name}</h2>
              </div>
            </div>
            <motion.button onClick={onClose} className="flex-shrink-0 ml-4 p-2 rounded-xl hover:bg-[rgba(0,66,37,0.06)] text-[#6b7280] hover:text-[#1a1f2e] transition-colors border border-transparent hover:border-[rgba(0,66,37,0.15)]" whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} transition={{ duration: 0.2 }}>
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Stat chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatChip delay={0.05} label="Risk Score" value={`${doc.riskScore}`} sub={`${doc.riskLevel} risk`} color={doc.riskLevel==='critical'?'text-[#7c2d2d]':doc.riskLevel==='high'?'text-[#9b3a2a]':doc.riskLevel==='medium'?'text-[#8a5c00]':'text-[#1a5c38]'} />
            <StatChip delay={0.10} label="RBI Violations" value={`${doc.rbiViolations}`} sub="detected" color={doc.rbiViolations>0?'text-[#7c2d2d]':'text-[#1a5c38]'} />
            <StatChip delay={0.15} label="Stated Rate" value={`${doc.statedRate}%`} sub="p.a. advertised" color="text-green-400" />
            <StatChip delay={0.20} label="Effective Rate" value={`${doc.effectiveRate}%`} sub="p.a. true cost" color={doc.effectiveRate>doc.statedRate+5?'text-[#7c2d2d]':'text-[#9b3a2a]'} />
          </div>

          {/* Predatory gauge */}
          <motion.div className="rounded-2xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] p-5 relative overflow-hidden" custom={1} variants={sv} initial="hidden" animate="visible" whileHover={{ borderColor: `${riskColor}40` }}>
            <PredatoryMeter score={doc.predatoryScore} />
          </motion.div>

          {/* Demographics */}
          <motion.div className="rounded-2xl border border-[rgba(201,168,76,0.15)] overflow-hidden" style={{ background: '#ede9df' }} custom={2} variants={sv} initial="hidden" animate="visible">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[rgba(201,168,76,0.12)]">
              <motion.div animate={{ rotate: [0,360] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}><Users className="w-4 h-4 text-[#004225]" /></motion.div>
              <h3 className="text-sm font-bold text-[#1a1f2e]">Borrower Demographics</h3>
              <motion.span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#004225]/20 bg-[#004225]/10 text-[#004225] uppercase tracking-wider" animate={{ opacity: [0.6,1,0.6] }} transition={{ duration: 2, repeat: Infinity }}>{d.borrowerType} Enterprise</motion.span>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-3">
              {([
                { icon: Building2, label: 'Business', value: d.businessName },
                { icon: Briefcase, label: 'Sector', value: d.sector },
                { icon: MapPin, label: 'State', value: d.state },
                { icon: Calendar, label: 'Years Operating', value: `${d.yearsInOperation} years` },
                { icon: IndianRupee, label: 'Annual Turnover', value: d.annualTurnover },
                { icon: Users, label: 'MSME Category', value: d.borrowerType },
                { icon: FileText, label: 'Loan Purpose', value: d.loanPurpose },
                { icon: d.firstTimeBorrower ? AlertCircle : CheckCircle2, label: 'Borrower Status', value: d.firstTimeBorrower ? 'First-time borrower' : 'Repeat borrower', color: d.firstTimeBorrower ? 'text-[#8a5c00]' : 'text-[#1a5c38]' },
              ] as any[]).map(({ icon: Icon, label, value, color }: any, ri: number) => (
                <motion.div key={label} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[rgba(0,66,37,0.05)] transition-colors" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + ri * 0.05 }}>
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/[0.15] flex items-center justify-center mt-0.5"><Icon className="w-3.5 h-3.5 text-[#004225]" /></div>
                  <div><p className="text-[10px] text-[#6b7280] uppercase tracking-wider">{label}</p><p className={`text-sm font-semibold ${color ?? 'text-[#1a1f2e]'}`}>{value}</p></div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Loan stats */}
          <motion.div className="rounded-2xl border border-[rgba(201,168,76,0.15)] overflow-hidden" style={{ background: '#ede9df' }} custom={3} variants={sv} initial="hidden" animate="visible">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[rgba(201,168,76,0.12)]"><Activity className="w-4 h-4 text-[#004225]" /><h3 className="text-sm font-bold text-[#1a1f2e]">Loan Statistics</h3></div>
            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-[#6b7280]">Principal: <span className="text-[#004225] font-bold">₹{fmt(doc.loanAmount)}</span></span><span className="text-[#6b7280]">Total Repayable: <span className="text-red-400 font-bold">₹{fmt(doc.totalRepayable)}</span></span></div>
                <div className="relative h-5 rounded-full bg-[rgba(0,66,37,0.06)] overflow-hidden">
                  <motion.div className="absolute inset-y-0 left-0 rounded-l-full" style={{ background: 'linear-gradient(90deg,#00422580,#004225)', boxShadow: '0 0 12px rgba(0,66,37,0.4)' }} initial={{ width: 0 }} animate={{ width: `${(doc.loanAmount/doc.totalRepayable)*100}%` }} transition={{ duration: 1, ease: [0.22,1,0.36,1] }} />
                  <motion.div className="absolute inset-y-0 rounded-r-full" style={{ left: `${(doc.loanAmount/doc.totalRepayable)*100}%`, right: 0, background: 'linear-gradient(90deg,#f8717180,#f87171)', boxShadow: '0 0 12px rgba(248,113,113,0.4)' }} initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.4 }} />
                </div>
                <motion.p className="text-xs text-red-400 font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>Overcharge: ₹{fmt(overcharge)} ({((overcharge/doc.loanAmount)*100).toFixed(1)}% above principal)</motion.p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'Stated', value: `${doc.statedRate}%`, color: '#4ade80', bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.2)', isMiddle: false },
                  { label: `+${(doc.effectiveRate-doc.statedRate).toFixed(1)}%`, value: 'Hidden', color: '#f87171', bg: 'rgba(248,113,113,0.04)', border: 'rgba(248,113,113,0.15)', isMiddle: true },
                  { label: 'Effective', value: `${doc.effectiveRate}%`, color: '#f87171', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.2)', isMiddle: false },
                ] as any[]).map((item: any, ci: number) => (
                  <motion.div key={item.label} className="rounded-xl p-3 text-center" style={{ background: item.bg, border: `1px solid ${item.border}` }} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3+ci*0.1 }} whileHover={{ scale: 1.05 }}>
                    {item.isMiddle ? (<><ArrowUpRight className="w-4 h-4 mx-auto mb-1" style={{ color: item.color }} /><p className="text-xs font-black" style={{ color: item.color }}>{item.label}</p><p className="text-[10px] text-[#6b7280]">cost added</p></>) : (<><p className="text-[10px] text-[#6b7280] mb-1">{item.label}</p><p className="text-xl font-black" style={{ color: item.color }}>{item.value}</p></>)}
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([{ label: 'Tenure', value: `${doc.tenure} months` }, { label: 'Approx. Monthly EMI', value: `₹${fmt(Math.round(doc.totalRepayable/doc.tenure))}` }] as any[]).map((item: any, ii: number) => (
                  <motion.div key={item.label} className="rounded-xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] p-3 hover:border-[#004225]/20 transition-colors" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5+ii*0.08 }} whileHover={{ scale: 1.02 }}>
                    <p className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">{item.label}</p><p className="text-lg font-bold text-[#1a1f2e]">{item.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Clause breakdown */}
          <motion.div className="rounded-2xl border border-[rgba(201,168,76,0.15)] overflow-hidden" style={{ background: '#ede9df' }} custom={4} variants={sv} initial="hidden" animate="visible">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[rgba(201,168,76,0.12)]"><BarChart3 className="w-4 h-4 text-[#004225]" /><h3 className="text-sm font-bold text-[#1a1f2e]">Clause Breakdown</h3><span className="ml-auto text-xs text-[#6b7280]">{Object.values(doc.clauseBreakdown).reduce((a,b)=>a+b,0)} clauses</span></div>
            <div className="p-5"><ClauseBar breakdown={doc.clauseBreakdown} /></div>
          </motion.div>

          {/* Key flags */}
          {doc.keyFlags.length > 0 && (
            <motion.div className="rounded-2xl border border-red-500/20 overflow-hidden" style={{ background: 'rgba(248,113,113,0.04)' }} custom={5} variants={sv} initial="hidden" animate="visible">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-red-500/10">
                <motion.div animate={{ scale: [1,1.2,1] }} transition={{ duration: 1.5, repeat: Infinity }}><AlertTriangle className="w-4 h-4 text-[#7c2d2d]" /></motion.div>
                <h3 className="text-sm font-bold text-[#1a1f2e]">Key Flags</h3>
                <span className="ml-auto text-xs font-bold text-[#7c2d2d] bg-[#7c2d2d]/8 px-2 py-0.5 rounded-full border border-[#7c2d2d]/25">{doc.keyFlags.length} issues</span>
              </div>
              <div className="p-5 space-y-3">
                {doc.keyFlags.map((flag, i) => (
                  <motion.div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:border-red-500/25 transition-all" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3+i*0.08 }} whileHover={{ x: 3 }}>
                    <XCircle className="w-4 h-4 text-[#7c2d2d] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[#6b7280] leading-relaxed">{flag}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Full analysis toggle */}
          <motion.div custom={6} variants={sv} initial="hidden" animate="visible">
            <motion.button onClick={() => setShowFullAnalysis(v => !v)} className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] hover:bg-[rgba(0,66,37,0.06)] transition-all group relative overflow-hidden" whileHover={{ borderColor: 'rgba(0,66,37,0.25)' }} whileTap={{ scale: 0.99 }}>
              <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg,rgba(0,66,37,0.04),rgba(201,168,76,0.04))' }} />
              <div className="relative flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#004225]/10 border border-[#004225]/20 flex items-center justify-center"><Zap className="w-4 h-4 text-[#004225]" /></div>
                <div className="text-left"><p className="text-sm font-bold text-[#1a1f2e]">Full Clause & RBI Analysis</p><p className="text-xs text-[#6b7280]">All {Object.values(doc.clauseBreakdown).reduce((a,b)=>a+b,0)} clauses · {doc.analysis.rbiViolations.length} violations · True cost breakdown</p></div>
              </div>
              <motion.div animate={{ rotate: showFullAnalysis ? 180 : 0 }} transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}><ChevronDown className="w-5 h-5 text-[#6b7280]" /></motion.div>
            </motion.button>
            <AnimatePresence>
              {showFullAnalysis && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }} className="overflow-hidden">
                  <div className="pt-4"><ResultsDashboard analysis={doc.analysis} /></div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}



export default function HistoryPage() {
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<HistoryDocument | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // API state
  const [documents, setDocuments]   = useState<HistoryDocument[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Debounced search fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getHistory({ search })
        .then(({ documents: docs, total: t }) => {
          setDocuments(docs);
          setTotal(t);
        })
        .catch((err) => setError(err?.message ?? 'Failed to load history'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Open detail panel — fetch full analysis on demand
  const handleSelectDoc = async (doc: HistoryDocument) => {
    setSelected(doc); // open panel immediately with summary data
    setLoadingDetail(true);
    try {
      const full = await getHistoryDocument(doc.id);
      setSelected(full);
    } catch {
      // keep summary data if full fetch fails
    } finally {
      setLoadingDetail(false);
    }
  };

  const filtered = documents; // already filtered server-side

  const totalDocs       = total;
  const criticalCount   = documents.filter((d) => d.riskLevel === 'critical').length;
  const avgPredatory    = documents.length
    ? Math.round(documents.reduce((s, d) => s + d.predatoryScore, 0) / documents.length)
    : 0;
  const totalViolations = documents.reduce((s, d) => s + d.rbiViolations, 0);

  const summaryCards = [
    { label: 'Total Analyzed',    num: totalDocs,        color: '#004225', suffix: '' },
    { label: 'Critical Risk',     num: criticalCount,    color: '#f87171', suffix: '' },
    { label: 'Avg Predatory Idx', num: avgPredatory,     color: avgPredatory >= 60 ? '#f87171' : avgPredatory >= 40 ? '#fb923c' : '#facc15', suffix: '' },
    { label: 'RBI Violations',    num: totalViolations,  color: '#fb923c', suffix: '' },
  ];

  return (
    <DashboardLayout >
      <main className="relative p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto min-h-screen">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <motion.div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-10"
            style={{ background: 'radial-gradient(circle, #c9a84c, transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl opacity-10"
            style={{ background: 'radial-gradient(circle, #004225, transparent 70%)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.12, 0.06] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </div>

        <div className="relative z-10 space-y-7">
          {/* Header */}
          <motion.div className="space-y-1" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }}>
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#004225]/20 bg-[#004225]/10"
                animate={{ boxShadow: ['0 0 0px #004225', '0 0 20px #00422560', '0 0 0px #004225'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Shield className="w-5 h-5 text-[#004225]" />
              </motion.div>
              <div>
                <h2 className="font-display text-3xl gradient-text">History</h2>
                <p className="text-[#6b7280] text-sm">Click any document to view demographics, statistics, and full analysis.</p>
              </div>
            </div>
          </motion.div>

          {/* Summary stat cards with counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summaryCards.map((s, i) => (
              <motion.div
                key={s.label}
                className="relative rounded-2xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] p-4 overflow-hidden group cursor-default"
                initial={{ opacity: 0, y: 20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.08 + i * 0.07, duration: 0.45, ease: [0.22,1,0.36,1] }}
                whileHover={{ scale: 1.04, borderColor: `${s.color}40` }}
              >
                <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at top left, ${s.color}10, transparent 70%)` }}
                />
                <motion.div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }}
                />
                <p className="text-[10px] text-[#6b7280] uppercase tracking-widest mb-1 font-semibold">{s.label}</p>
                <p className="text-3xl font-black" style={{ color: s.color }}>
                  <Counter to={s.num} duration={1 + i * 0.15} suffix={s.suffix} />
                </p>
              </motion.div>
            ))}
          </div>

          {/* Search */}
          <motion.div className="relative" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input
              type="text"
              placeholder="Search by document, lender, or business name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] text-[#1a1f2e] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#004225]/40 focus:border-[#004225]/30 transition-all text-sm"
            />
          </motion.div>

          {/* Document list */}
          <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            {loading ? (
              /* Loading skeletons */
              Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="rounded-2xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] p-4 h-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                >
                  <div className="flex items-center gap-4 h-full">
                    <div className="w-11 h-11 rounded-xl bg-[rgba(0,66,37,0.06)] flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-[rgba(0,66,37,0.06)] rounded-full w-2/3" />
                      <div className="h-2 bg-[rgba(0,66,37,0.06)] rounded-full w-1/2" />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : error ? (
              <motion.div
                className="rounded-2xl border border-[#7c2d2d]/20 bg-[#7c2d2d]/5 p-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-sm text-red-400 font-semibold mb-1">Failed to load history</p>
                <p className="text-xs text-[#6b7280]">{error}</p>
                <motion.button
                  className="mt-4 text-xs text-[#004225] hover:text-[#2d6a4f] underline"
                  onClick={() => setSearch(s => s)} // re-trigger effect
                  whileHover={{ scale: 1.05 }}
                >
                  Retry
                </motion.button>
              </motion.div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-[rgba(201,168,76,0.15)] p-12 text-center">
                <p className="text-[#6b7280] text-sm">No documents match your search.</p>
              </div>
            ) : (
              filtered.map((doc, i) => {
                const rc = doc.riskLevel === 'critical' ? '#f87171' : doc.riskLevel === 'high' ? '#fb923c' : doc.riskLevel === 'medium' ? '#facc15' : '#4ade80';
                const isHovered = hoveredId === doc.id;
                return (
                  <motion.div
                    key={doc.id}
                    className="relative rounded-2xl border border-[rgba(201,168,76,0.15)] bg-[rgba(0,66,37,0.04)] p-4 flex items-center gap-4 cursor-pointer group overflow-hidden"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.06, duration: 0.4, ease: [0.22,1,0.36,1] }}
                    whileHover={{ x: 4, borderColor: `${rc}35` }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSelectDoc(doc)}
                    onHoverStart={() => setHoveredId(doc.id)}
                    onHoverEnd={() => setHoveredId(null)}
                  >
                    {/* Hover glow */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at left, ${rc}08, transparent 60%)` }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                    {/* Left accent bar */}
                    <motion.div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                      style={{ background: rc }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.25 }}
                    />

                    {/* Icon */}
                    <motion.div
                      className="relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border border-[rgba(0,66,37,0.15)]"
                      style={{ background: `${rc}12` }}
                      animate={isHovered ? { boxShadow: `0 0 16px ${rc}50` } : { boxShadow: '0 0 0px transparent' }}
                      transition={{ duration: 0.3 }}
                    >
                      <FileText className="w-4 h-4" style={{ color: rc }} />
                    </motion.div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1a1f2e] text-sm truncate">{doc.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <span className="text-xs text-[#6b7280]">{doc.lenderName}</span>
                        <span className="text-xs text-[#6b7280]/40">·</span>
                        <span className="text-xs text-[#6b7280]">{doc.demographics.businessName}</span>
                        <span className="text-xs text-[#6b7280]/40">·</span>
                        <span className="flex items-center gap-1 text-xs text-[#6b7280]">
                          <Clock className="w-3 h-3" />
                          {doc.analyzedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Predatory score */}
                    <div className="hidden sm:flex flex-col items-center flex-shrink-0 w-16">
                      <span className="text-[10px] text-[#6b7280] mb-1 uppercase tracking-wider">Predatory</span>
                      <motion.span
                        className="text-xl font-black"
                        style={{ color: doc.predatoryScore >= 70 ? '#f87171' : doc.predatoryScore >= 50 ? '#fb923c' : doc.predatoryScore >= 30 ? '#facc15' : '#4ade80' }}
                        animate={isHovered ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        {doc.predatoryScore}
                      </motion.span>
                    </div>

                    {/* Risk badge */}
                    <motion.div
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold capitalize ${riskBadge[doc.riskLevel]}`}
                      animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.span
                        className={`w-1.5 h-1.5 rounded-full ${riskDot[doc.riskLevel]}`}
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      {doc.riskLevel}
                    </motion.div>

                    <motion.div animate={{ x: isHovered ? 3 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronRight className="flex-shrink-0 w-4 h-4 text-[#6b7280] group-hover:text-[#004225] transition-colors" />
                    </motion.div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </div>
      </main>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <DetailPanel doc={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
