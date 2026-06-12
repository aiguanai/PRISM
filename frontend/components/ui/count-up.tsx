'use client';

import { animate, useMotionValue, useTransform, motion } from 'framer-motion';
import { useEffect } from 'react';

interface CountUpProps {
  value: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Delay before the count starts, in seconds */
  delay?: number;
  className?: string;
}

/**
 * Animated number count-up — PRISM's signature stat-card motion.
 * Renders with mono + tabular-nums so digits never jitter horizontally.
 */
export function CountUp({ value, duration = 1.1, delay = 0, className = '' }: CountUpProps) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString('en-IN'));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value, duration, delay, motionValue]);

  return <motion.span className={`num ${className}`}>{rounded}</motion.span>;
}
