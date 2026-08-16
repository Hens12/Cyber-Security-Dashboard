/* ═══════════════════════════════════════════════════════════
   Utility — Color & Severity Mapping
   ═══════════════════════════════════════════════════════════ */

import type { Severity } from '../types/security';

export const severityColors: Record<Severity, { text: string; bg: string; border: string; dot: string }> = {
  critical: {
    text: '#FF1744',
    bg: 'rgba(255, 23, 68, 0.12)',
    border: 'rgba(255, 23, 68, 0.3)',
    dot: '#FF1744',
  },
  high: {
    text: '#FF6E40',
    bg: 'rgba(255, 110, 64, 0.12)',
    border: 'rgba(255, 110, 64, 0.3)',
    dot: '#FF6E40',
  },
  medium: {
    text: '#FFD600',
    bg: 'rgba(255, 214, 0, 0.12)',
    border: 'rgba(255, 214, 0, 0.3)',
    dot: '#FFD600',
  },
  low: {
    text: '#00E5FF',
    bg: 'rgba(0, 229, 255, 0.12)',
    border: 'rgba(0, 229, 255, 0.3)',
    dot: '#00E5FF',
  },
  info: {
    text: '#8899AA',
    bg: 'rgba(136, 153, 170, 0.12)',
    border: 'rgba(136, 153, 170, 0.2)',
    dot: '#8899AA',
  },
};

export const statusColors: Record<string, string> = {
  online: '#00FF88',
  offline: '#FF1744',
  degraded: '#FFD600',
  connected: '#00FF88',
  disconnected: '#FF1744',
  reconnecting: '#FFD600',
};

export function getSeverityColor(severity: Severity) {
  return severityColors[severity] || severityColors.info;
}
