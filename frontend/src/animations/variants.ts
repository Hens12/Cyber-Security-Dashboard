/* ═══════════════════════════════════════════════════════════
   Framer Motion — Animation Presets
   ═══════════════════════════════════════════════════════════ */

import type { Variants, Transition } from 'framer-motion';

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export const smoothTransition: Transition = {
  type: 'tween',
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.4,
};

// Page transitions
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

// Card hover
export const cardVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  hover: {
    y: -2,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 229, 255, 0.08)',
    transition: { duration: 0.2 },
  },
};

// Staggered list
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// Slide in from right (for drawers/notifications)
export const slideInRight: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2 } },
};

// Slide in from left (sidebar)
export const slideInLeft: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.3 } },
  exit: { x: -20, opacity: 0 },
};

// Scale up (modals)
export const scaleUp: Variants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: springTransition },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.15 } },
};

// Fade
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Counter (number change)
export const counterVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// Notification toast
export const toastVariants: Variants = {
  initial: { opacity: 0, y: -20, x: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, x: 0, scale: 1, transition: springTransition },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

// Threat feed item
export const threatFeedItem: Variants = {
  initial: { opacity: 0, height: 0, y: -10 },
  animate: {
    opacity: 1,
    height: 'auto',
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.2 },
  },
};

// Pulse effect for live indicators
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};
