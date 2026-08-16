/* ═══════════════════════════════════════════════════════════
   CyberCard — Glass panel component
   ═══════════════════════════════════════════════════════════ */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cardVariants } from '../../animations/variants';

interface CyberCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'cyan' | 'red' | 'green' | 'yellow' | 'purple' | 'none';
  noPadding?: boolean;
  onClick?: () => void;
}

export default function CyberCard({
  children,
  className = '',
  hover = true,
  glow = 'none',
  noPadding = false,
  onClick,
}: CyberCardProps) {
  const glowClass = glow !== 'none' ? `glow-${glow}` : '';
  const padding = noPadding ? '' : 'p-4';
  const cursor = onClick ? 'cursor-pointer' : '';

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={hover ? 'hover' : undefined}
      onClick={onClick}
      className={`glass-panel ${padding} ${glowClass} ${cursor} transition-colors duration-200 ${className}`}
    >
      {children}
    </motion.div>
  );
}
