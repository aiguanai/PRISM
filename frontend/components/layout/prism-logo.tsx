'use client';

import { motion } from 'framer-motion';

interface PrismLogoProps {
  size?: number;
  animated?: boolean;
}

/**
 * Geometric prism diamond — matches the uploaded brand logo.
 * Four facets: dark navy left, steel blue right, sky blue top, light cyan bottom-right.
 */
export function PrismLogo({ size = 36, animated = true }: PrismLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left dark facet */}
      <motion.path
        d="M20 2 L2 28 L20 38 Z"
        fill="#00311b"
        animate={animated ? { opacity: [0.85, 1, 0.85] } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Right mid-green facet */}
      <motion.path
        d="M20 2 L38 28 L20 38 Z"
        fill="#004225"
        animate={animated ? { opacity: [0.9, 1, 0.9] } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      {/* Bottom-left sage facet */}
      <motion.path
        d="M2 28 L20 38 L14 44 Z"
        fill="#2d6a4f"
        animate={animated ? { opacity: [0.8, 1, 0.8] } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      {/* Bottom-right gold facet */}
      <motion.path
        d="M38 28 L20 38 L26 44 Z"
        fill="#c9a84c"
        animate={animated ? { opacity: [0.85, 1, 0.85] } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      {/* Bottom centre connector */}
      <motion.path
        d="M14 44 L20 38 L26 44 Z"
        fill="#8a6a1a"
        animate={animated ? { opacity: [0.9, 1, 0.9] } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      />
    </svg>
  );
}
