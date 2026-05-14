'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, History, Settings, Home, X, Clock, Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DM: React.CSSProperties = { fontFamily: "'DM Serif Display', Georgia, serif" };

const navItems = [
  { id: 'home',     label: 'Dashboard',    href: '/',         icon: <Home     className="w-4 h-4" /> },
  { id: 'new',      label: 'New Analysis', href: '/new',      icon: <FileText className="w-4 h-4" /> },
  { id: 'history',  label: 'History',      href: '/history',  icon: <History  className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings',     href: '/settings', icon: <Settings className="w-4 h-4" /> },
];

const recentDocs = [
  { name: 'MSME Term Loan Agreement.pdf',      risk: '#7c2d2d' },
  { name: 'Business Loan Sanction Letter.pdf', risk: '#9b3a2a' },
];

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
          className="p-2 rounded"
          style={{ color: 'rgba(232,240,235,0.6)' }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Section label */}
      <div className="px-5 pt-6 pb-2">
        <p style={{ ...DM, fontSize: '9px', color: 'rgba(201,168,76,0.55)', letterSpacing: '0.2em' }}>
          NAVIGATION
        </p>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-0.5 flex-1">
        {navItems.map((item, i) => {
          const active = isActive(item.href);
          return (
            <Link key={item.id} href={item.href} onClick={onClose}>
              <motion.div
                className="relative flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer group"
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                  borderLeft: active ? '2px solid #c9a84c' : '2px solid transparent',
                }}
              >
                {!active && (
                  <div
                    className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(201,168,76,0.06)' }}
                  />
                )}
                <span
                  className="relative z-10 flex-shrink-0"
                  style={{ color: active ? '#c9a84c' : 'rgba(232,240,235,0.55)' }}
                >
                  {item.icon}
                </span>
                <span
                  className="relative z-10 text-sm"
                  style={{
                    ...DM,
                    color: active ? '#f0ede4' : 'rgba(232,240,235,0.55)',
                    fontSize: '13px',
                  }}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Gold divider */}
      <div className="mx-4 my-3" style={{ height: '1px', background: 'rgba(201,168,76,0.15)' }} />

      {/* Recent */}
      <div className="px-5 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3 h-3" style={{ color: 'rgba(201,168,76,0.5)' }} />
          <p style={{ ...DM, fontSize: '9px', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.18em' }}>
            RECENT
          </p>
        </div>
        <div className="space-y-1">
          {recentDocs.map((doc, i) => (
            <Link href="/history" key={i} onClick={onClose}>
              <motion.div
                className="flex items-center gap-2.5 px-2 py-1.5 rounded cursor-pointer group"
                whileHover={{ x: 2 }}
              >
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: doc.risk }} />
                <span
                  className="text-xs truncate flex-1 group-hover:opacity-100 transition-opacity"
                  style={{ ...DM, color: 'rgba(232,240,235,0.45)', fontSize: '11px' }}
                >
                  {doc.name}
                </span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Status card — gold border */}
      <div
        className="m-3 p-4 rounded"
        style={{
          background: 'rgba(0,49,27,0.6)',
          border: '1px solid rgba(201,168,76,0.25)',
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Shield className="w-3.5 h-3.5" style={{ color: '#c9a84c' }} />
          <span style={{ ...DM, fontSize: '12px', color: '#f0ede4' }}>Analysis Engine</span>
        </div>
        <p style={{ ...DM, fontSize: '10px', color: 'rgba(232,240,235,0.5)', lineHeight: 1.6 }}>
          Ready to audit MSME loan agreements
        </p>
        <div className="mt-2.5 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(201,168,76,0.15)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #004225, #c9a84c)' }}
            initial={{ width: '0%' }}
            animate={{ width: '92%' }}
            transition={{ duration: 1.4, delay: 0.6, ease: 'easeOut' }}
          />
        </div>
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

      <motion.aside
        className={`fixed lg:sticky top-16 lg:top-0 left-0 h-[calc(100vh-4rem)] lg:h-screen w-60 overflow-y-auto z-40 lg:z-auto ${className}`}
        style={{
          background: '#004225',
          borderRight: '1px solid rgba(201,168,76,0.2)',
          x: isOpen ? 0 : -240,
        } as React.CSSProperties}
        animate={{ x: isOpen ? 0 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}
