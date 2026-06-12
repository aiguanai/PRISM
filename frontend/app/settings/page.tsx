'use client';

import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, Sun, Moon, Eye, EyeOff,
  Trash2, Loader2, Server, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useSettings } from '@/lib/settings';

function Section({ title, description, children, delay = 0 }: {
  title: string; description: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.section
      className="card-elevated overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </motion.section>
  );
}

function ToggleRow({ label, sub, checked, onChange, iconOn, iconOff }: {
  label: string; sub: string; checked: boolean; onChange: (v: boolean) => void;
  iconOn: React.ReactNode; iconOff: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-9 h-9 rounded-md bg-primary/6 border border-primary/15 flex items-center justify-center text-primary">
          {checked ? iconOn : iconOff}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [settings, updateSettings] = useSettings();

  const [health, setHealth] = useState<'checking' | 'healthy' | 'unreachable'>('checking');
  const [backendUrl, setBackendUrl] = useState('');
  const [healthKey, setHealthKey] = useState(0);

  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setHealth('checking');
    fetch('/api/backend-health')
      .then(async (res) => {
        const body = await res.json();
        setBackendUrl(body.backendUrl ?? '');
        setHealth(res.ok ? 'healthy' : 'unreachable');
      })
      .catch(() => setHealth('unreachable'));
  }, [healthKey]);

  const handleClearHistory = async () => {
    if (!window.confirm('Delete ALL analysis history and reports? This cannot be undone.')) return;
    setClearing(true);
    setClearResult(null);
    try {
      const res = await fetch('/api/documents', { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? 'Clear failed');
      setClearResult(`Deleted ${body.deleted ?? 0} stored analyses.`);
    } catch (err: any) {
      setClearResult(err?.message ?? 'Failed to clear history.');
    } finally {
      setClearing(false);
    }
  };

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <DashboardLayout>
      <main className="relative p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto min-h-screen">
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-10 h-10 rounded-md flex items-center justify-center border border-primary/20 bg-primary/8">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground text-sm">Preferences are saved in this browser.</p>
            </div>
          </motion.div>

          {/* Appearance */}
          <Section title="Appearance" description="Theme applies across the whole app." delay={0.05}>
            <ToggleRow
              label="Dark mode"
              sub={isDark ? 'Dark theme active' : 'Light theme active'}
              checked={isDark}
              onChange={(v) => setTheme(v ? 'dark' : 'light')}
              iconOn={<Moon className="w-4 h-4" />}
              iconOff={<Sun className="w-4 h-4" />}
            />
          </Section>

          {/* Analysis display */}
          <Section title="Analysis Display" description="Control what appears in the results dashboard." delay={0.1}>
            <ToggleRow
              label="Show safe clauses"
              sub="Include low-risk / standard clauses in the clause analysis list"
              checked={settings.showSafeClauses}
              onChange={(v) => updateSettings({ showSafeClauses: v })}
              iconOn={<Eye className="w-4 h-4" />}
              iconOff={<EyeOff className="w-4 h-4" />}
            />
          </Section>

          {/* Backend status */}
          <Section title="Backend" description="Connectivity to the analysis API." delay={0.15}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 rounded-md bg-primary/6 border border-primary/15 flex items-center justify-center text-primary">
                  <Server className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {health === 'checking' && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
                    {health === 'healthy' && <CheckCircle2 className="w-3.5 h-3.5 text-sev-low" />}
                    {health === 'unreachable' && <XCircle className="w-3.5 h-3.5 text-sev-critical" />}
                    <p className="text-sm font-semibold text-foreground">
                      {health === 'checking' ? 'Checking…' : health === 'healthy' ? 'Connected' : 'Unreachable'}
                    </p>
                  </div>
                  <p className="num text-xs text-muted-foreground truncate">{backendUrl || 'Backend URL not resolved yet'}</p>
                </div>
              </div>
              <motion.button
                onClick={() => setHealthKey(k => k + 1)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-border bg-card text-foreground hover:border-accent/50 transition-colors"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-check
              </motion.button>
            </div>
            {health === 'unreachable' && (
              <p className="mt-3 text-xs text-sev-critical">
                Start the backend: <code className="num">cd backend</code> then{' '}
                <code className="num">uvicorn main:app --reload --port 8000</code>
              </p>
            )}
          </Section>

          {/* Data */}
          <Section title="Data" description="Stored analyses live in the backend database." delay={0.2}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 rounded-md bg-sev-critical-bg border border-sev-critical-border flex items-center justify-center text-sev-critical">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Clear analysis history</p>
                  <p className="text-xs text-muted-foreground">Permanently deletes every stored analysis and PDF report.</p>
                </div>
              </div>
              <motion.button
                onClick={handleClearHistory}
                disabled={clearing}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-sev-critical-border bg-sev-critical-bg text-sev-critical hover:brightness-95 transition-all disabled:opacity-50"
                whileHover={!clearing ? { scale: 1.04 } : undefined}
                whileTap={!clearing ? { scale: 0.96 } : undefined}
              >
                {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {clearing ? 'Clearing…' : 'Clear all'}
              </motion.button>
            </div>
            {clearResult && <p className="mt-3 text-xs text-muted-foreground">{clearResult}</p>}
          </Section>
        </div>
      </main>
    </DashboardLayout>
  );
}
