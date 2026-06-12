'use client';

import { motion } from 'framer-motion';

interface PrismLogoProps {
  size?: number;
  animated?: boolean;
}

const facets = [
  { d: 'M20 2 L2 28 L20 38 Z',   fill: '#00311b' }, // left dark
  { d: 'M20 2 L38 28 L20 38 Z',  fill: '#004225' }, // right mid-green
  { d: 'M2 28 L20 38 L14 44 Z',  fill: '#2d6a4f' }, // bottom-left sage
  { d: 'M38 28 L20 38 L26 44 Z', fill: '#c9a84c' }, // bottom-right gold
  { d: 'M14 44 L20 38 L26 44 Z', fill: '#8a6a1a' }, // bottom centre
];

/**
 * Geometric prism diamond. Facets shimmer ONCE on mount (staggered reveal),
 * then rest — no infinite ambient animation.
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
      {facets.map((f, i) => (
        <motion.path
          key={i}
          d={f.d}
          fill={f.fill}
          initial={animated ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
        />
      ))}
    </svg>
  );
}
