'use client';

import { motion } from 'framer-motion';
import { Menu, Moon, Plus, Sun } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { PrismLogo } from './prism-logo';

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = resolvedTheme === 'dark';
  return (
    <motion.button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </motion.button>
  );
}

interface HeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export function Header({ onMenuClick, showMenu = true }: HeaderProps) {
  return (
    <motion.header
      className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border"
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Champagne gold top hairline — the one piece of ornament */}
      <div className="absolute top-0 left-0 right-0 hairline-gold" />

      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[60px]">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3">
          {showMenu && (
            <motion.button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              whileTap={{ scale: 0.9 }}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </motion.button>
          )}

          <Link href="/" className="flex items-center gap-3 group">
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
              <PrismLogo size={28} animated />
            </motion.div>

            <div className="flex flex-col leading-none gap-0.5">
              <span className="text-[17px] font-bold tracking-[0.14em] text-foreground">
                PRISM
              </span>
              <span className="label-caps !text-[8.5px] !tracking-[0.16em] !text-gold-text">
                Predatory Risk Intelligence
              </span>
            </div>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link href="/new">
            <motion.div
              className="flex items-center gap-1.5 pl-3.5 pr-4 py-2 rounded-full cursor-pointer bg-primary text-primary-foreground text-[13px] font-semibold shadow-sm"
              whileHover={{ scale: 1.03, boxShadow: 'var(--shadow-md)' }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus className="w-3.5 h-3.5" />
              New Analysis
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
