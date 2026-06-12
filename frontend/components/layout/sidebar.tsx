'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, History, Home, Settings, X, Clock, Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getHistory } from '@/lib/api';
import type { HistoryDocument } from '@/lib/types';

const navItems = [
  { id: 'home',     label: 'Dashboard',    href: '/',         icon: <Home     className="w-4 h-4" /> },
  { id: 'new',      label: 'New Analysis', href: '/new',      icon: <FileText className="w-4 h-4" /> },
  { id: 'history',  label: 'History',      href: '/history',  icon: <History  className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings',     href: '/settings', icon: <Settings className="w-4 h-4" /> },
];

const riskDot: Record<string, string> = {
  critical: 'bg-sev-critical',
  high:     'bg-sev-high',
  medium:   'bg-sev-medium',
  low:      'bg-sev-low',
};

/** Real recent analyses pulled from the backend — replaces old hardcoded mocks. */
function RecentDocs({ onClose }: { onClose?: () => void }) {
  const [docs, setDocs] = useState<HistoryDocument[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHistory({ page: 1, limit: 3 })
      .then((res) => { if (!cancelled) setDocs(res.documents.slice(0, 3)); })
      .catch(() => { if (!cancelled) setDocs([]); });
    return () => { cancelled = true; };
  }, []);

  // Loading skeleton
  if (docs === null) {
    return (
      <div className="space-y-2 px-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 rounded-md bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <p className="px-2 text-[10px] text-sidebar-foreground/35">
        No analyses yet
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {docs.map((doc) => (
        <Link href="/history" key={doc.id} onClick={onClose}>
          <motion.div
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer group hover:bg-white/5 transition-colors"
            whileHover={{ x: 2 }}
          >
            <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${riskDot[doc.riskLevel] ?? 'bg-sev-low'}`} />
            <span className="text-[11px] truncate flex-1 text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80 transition-colors">
              {doc.name}
            </span>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ isOpen = false, onClose, className = '' }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Mobile close */}
      <div className="lg:hidden flex justify-end p-3">
        <motion.button
          onClick={onClose}
          className="p-2 rounded-md text-sidebar-foreground/60"
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Section label */}
      <div className="px-5 pt-6 pb-2">
        <p className="label-caps !text-[9px] !text-sidebar-primary/60">Navigation</p>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-0.5 flex-1">
        {navItems.map((item, i) => {
          const active = isActive(item.href);
          return (
            <Link key={item.id} href={item.href} onClick={onClose}>
              <motion.div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer group transition-colors ${
                  active
                    ? 'bg-sidebar-primary/12 border-l-2 border-sidebar-primary'
                    : 'border-l-2 border-transparent hover:bg-white/5'
                }`}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <span className={`flex-shrink-0 ${active ? 'text-sidebar-primary' : 'text-sidebar-foreground/55'}`}>
                  {item.icon}
                </span>
                <span className={`text-[13px] font-medium ${active ? 'text-sidebar-foreground' : 'text-sidebar-foreground/55'}`}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Gold divider */}
      <div className="mx-4 my-3 h-px bg-sidebar-border" />

      {/* Recent — real data */}
      <div className="px-5 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3 h-3 text-sidebar-primary/50" />
          <p className="label-caps !text-[9px] !text-sidebar-primary/50">Recent</p>
        </div>
        <RecentDocs onClose={onClose} />
      </div>

      {/* Engine status */}
      <div className="m-3 p-4 rounded-lg bg-sidebar-accent border border-sidebar-border">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-3.5 h-3.5 text-sidebar-primary" />
          <span className="text-xs font-semibold text-sidebar-foreground">Analysis Engine</span>
        </div>
        <p className="text-[10px] leading-relaxed text-sidebar-foreground/50">
          <span className="num">170</span> RBI rules · <span className="num">12</span> risk categories
        </p>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm lg:hidden z-30"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:sticky top-16 lg:top-0 left-0 h-[calc(100vh-4rem)] lg:h-full w-60 overflow-y-auto z-40 lg:z-auto transition-transform duration-300 ease-out bg-sidebar border-r border-sidebar-border ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${className}`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
