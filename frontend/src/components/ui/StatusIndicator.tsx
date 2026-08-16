/* ═══════════════════════════════════════════════════════════
   StatusIndicator — Animated status dot with label
   ═══════════════════════════════════════════════════════════ */

import { motion } from 'framer-motion';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'degraded' | 'connected' | 'disconnected' | 'reconnecting';
  label?: string;
  showPulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  online: { color: '#00FF88', label: 'ONLINE' },
  offline: { color: '#FF1744', label: 'OFFLINE' },
  degraded: { color: '#FFD600', label: 'DEGRADED' },
  connected: { color: '#00FF88', label: 'CONNECTED' },
  disconnected: { color: '#FF1744', label: 'DISCONNECTED' },
  reconnecting: { color: '#FFD600', label: 'RECONNECTING' },
};

export default function StatusIndicator({
  status,
  label,
  showPulse = true,
  size = 'sm',
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const dotSize = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' };
  const fontSize = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        <span
          className={`${dotSize[size]} rounded-full`}
          style={{ backgroundColor: config.color }}
        />
        {showPulse && status !== 'offline' && status !== 'disconnected' && (
          <motion.span
            className="absolute rounded-full"
            style={{
              width: size === 'sm' ? 8 : size === 'md' ? 10 : 12,
              height: size === 'sm' ? 8 : size === 'md' ? 10 : 12,
              border: `1px solid ${config.color}`,
            }}
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </div>
      {(label || config.label) && (
        <span
          className={`${fontSize[size]} font-mono font-medium tracking-wider`}
          style={{ color: config.color }}
        >
          {label || config.label}
        </span>
      )}
    </div>
  );
}
