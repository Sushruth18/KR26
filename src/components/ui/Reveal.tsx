import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../../hooks/useMotionPrefs';

interface Props {
  children: ReactNode;
  className?: string;
  /** Stagger position, 0.06 s per step. */
  index?: number;
}

/** Scroll reveal (CLAUDE.md §3): fade + 16 px rise, once, 0.4 s. Reduced motion shows the final state. */
export function Reveal({ children, className, index = 0 }: Props) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
