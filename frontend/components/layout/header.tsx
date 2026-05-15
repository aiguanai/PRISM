'use client';

import { motion } from 'framer-motion';
import { Menu, Plus, Bell } from 'lucide-react';
import Link from 'next/link';
import { PrismLogo } from './prism-logo';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export function Header({ onMenuClick, showMenu = true }: HeaderProps) {
  return (
    <motion.header
      className="sticky top-0 z-40"
      style={{
        background: '#004225',
        borderBottom: '1px solid rgba(201,168,76,0.25)',
      }}
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Champagne gold top line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent, #c9a84c 30%, #e2c97e 50%, #c9a84c 70%, transparent)' }}
      />

      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8" style={{ height: '60px' }}>

        {/* Logo + wordmark */}
        <div className="flex items-center gap-3">
          {showMenu && (
            <motion.button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'rgba(232,240,235,0.7)' }}
              whileTap={{ scale: 0.9 }}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </motion.button>
          )}

          <Link href="/" className="flex items-center gap-3 group">
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
              <PrismLogo size={30} animated />
            </motion.div>

            <div className="flex flex-col leading-none">
              <span
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: '19px',
                  color: '#f4f1ea',
                  letterSpacing: '0.08em',
                  fontWeight: 400,
                }}
              >
                PRISM
              </span>
              <span
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: '9px',
                  color: 'rgba(201,168,76,0.85)',
                  letterSpacing: '0.12em',
                  fontWeight: 400,
                }}
              >
                Predatory Risk Intelligence
              </span>
            </div>
          </Link>
        </div>

        {/* Centre tagline */}
        <div className="hidden lg:flex items-center">
          <motion.span
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: '11px',
              color: 'rgba(201,168,76,0.6)',
              letterSpacing: '0.14em',
              fontStyle: 'italic',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            for Smart MSME Lending
          </motion.span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: 'rgba(232,240,235,0.6)' }}
            whileHover={{ color: '#f4f1ea', scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell className="w-4 h-4" />
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
              style={{ background: '#c9a84c' }}
            />
          </motion.button>

          <Link href="/new">
            <motion.div
              className="flex items-center gap-1.5 px-4 py-2 rounded cursor-pointer"
              style={{
                background: 'rgba(201,168,76,0.15)',
                border: '1px solid rgba(201,168,76,0.4)',
                color: '#e2c97e',
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '13px',
                letterSpacing: '0.04em',
              }}
              whileHover={{
                background: 'rgba(201,168,76,0.25)',
                borderColor: 'rgba(201,168,76,0.7)',
                scale: 1.02,
              }}
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
