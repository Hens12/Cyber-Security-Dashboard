/* ═══════════════════════════════════════════════════════════
   MetricCard — KPI card with icon, counter, trend
   ═══════════════════════════════════════════════════════════ */

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import LiveCounter from './LiveCounter';
import { staggerItem } from '../../animations/variants';

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  format?: (n: number) => string;
  decimals?: number;
  suffix?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  format,
  decimals = 0,
  suffix = '',
  trend,
  trendValue,
}: MetricCardProps) {
  const trendColor = trend === 'up' ? '#FF1744' : trend === 'down' ? '#00FF88' : '#8899AA';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{
        y: -2,
        borderColor: `${color}33`,
        boxShadow: `0 4px 20px ${color}15`,
      }}
      className="glass-panel p-4 transition-all duration-200 cursor-default group"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: trendColor }}>
            <span>{trendIcon}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <LiveCounter
            value={value}
            format={format}
            decimals={decimals}
            className="text-2xl font-bold text-cyber-text"
          />
          {suffix && (
            <span className="text-xs text-cyber-text-secondary font-mono">{suffix}</span>
          )}
        </div>
        <p className="text-[11px] text-cyber-text-secondary font-medium uppercase tracking-wider">
          {title}
        </p>
      </div>

      {/* Bottom accent line */}
      <div
        className="mt-3 h-[1px] w-full rounded opacity-30 group-hover:opacity-60 transition-opacity"
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );
}
